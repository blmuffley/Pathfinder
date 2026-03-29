// SPDX-License-Identifier: GPL-2.0
// Pathfinder Agent — eBPF flow tracker
//
// Attaches to kernel tracepoints to capture TCP connection lifecycle events.
// Emits FlowEvent records via a ring buffer to userspace.
//
// Build: clang -O2 -g -target bpf -c flow_tracker.c -o flow_tracker.o

#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_core_read.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_endian.h>

#define AF_INET  2
#define AF_INET6 10

#define TASK_COMM_LEN 16

// FlowEvent is emitted to userspace on connection close.
struct flow_event {
    __u32 pid;
    __u32 uid;
    __u32 src_ip;
    __u32 dst_ip;
    __u16 src_port;
    __u16 dst_port;
    __u8  protocol;  // IPPROTO_TCP = 6, IPPROTO_UDP = 17
    __u8  _pad[3];
    __u64 bytes_sent;
    __u64 bytes_received;
    __u64 timestamp_ns;
    __u64 duration_ns;
    char  comm[TASK_COMM_LEN];
};

// Tracks in-flight connections: key = (pid, src_port)
struct conn_key {
    __u32 pid;
    __u16 src_port;
    __u16 _pad;
};

struct conn_info {
    __u32 src_ip;
    __u32 dst_ip;
    __u16 src_port;
    __u16 dst_port;
    __u32 pid;
    __u32 uid;
    __u64 start_ns;
    char  comm[TASK_COMM_LEN];
};

// Maps
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 65536);
    __type(key, struct conn_key);
    __type(value, struct conn_info);
} conn_map SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 1 << 24); // 16 MB ring buffer
} events SEC(".maps");

// Filter map — userspace can set PID 0 = 1 to enable all, or specific PIDs
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1);
    __type(key, __u32);
    __type(value, __u8);
} config_map SEC(".maps");

// -----------------------------------------------------------------------
// Tracepoint: tcp_connect — fires when a TCP connection is initiated
// -----------------------------------------------------------------------
SEC("tracepoint/tcp/tcp_connect")
int trace_tcp_connect(struct trace_event_raw_tcp_event_sk_skb_tcp *ctx)
{
    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 pid = pid_tgid >> 32;

    struct sock *sk = (struct sock *)ctx->skaddr;
    if (!sk)
        return 0;

    // Only track AF_INET (IPv4) for now
    __u16 family = BPF_CORE_READ(sk, __sk_common.skc_family);
    if (family != AF_INET)
        return 0;

    struct conn_info info = {};
    info.pid = pid;
    info.uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    info.src_ip = BPF_CORE_READ(sk, __sk_common.skc_rcv_saddr);
    info.dst_ip = BPF_CORE_READ(sk, __sk_common.skc_daddr);
    info.src_port = BPF_CORE_READ(sk, __sk_common.skc_num);
    info.dst_port = bpf_ntohs(BPF_CORE_READ(sk, __sk_common.skc_dport));
    info.start_ns = bpf_ktime_get_ns();
    bpf_get_current_comm(&info.comm, sizeof(info.comm));

    struct conn_key key = {
        .pid = pid,
        .src_port = info.src_port,
    };

    bpf_map_update_elem(&conn_map, &key, &info, BPF_ANY);
    return 0;
}

// -----------------------------------------------------------------------
// Tracepoint: inet_sock_set_state — fires on TCP state transitions
// We capture the CLOSE/FIN_WAIT states to record completed flows.
// -----------------------------------------------------------------------
SEC("tracepoint/sock/inet_sock_set_state")
int trace_inet_sock_set_state(struct trace_event_raw_inet_sock_set_state *ctx)
{
    // Only care about transitions TO closed states
    int newstate = ctx->newstate;
    int oldstate = ctx->oldstate;

    // TCP_CLOSE = 7, TCP_FIN_WAIT1 = 4 (connection teardown)
    if (newstate != 7)
        return 0;

    // Only track established connections closing
    // TCP_ESTABLISHED = 1, TCP_FIN_WAIT1 = 4, TCP_FIN_WAIT2 = 5, TCP_CLOSE_WAIT = 8
    if (oldstate != 1 && oldstate != 4 && oldstate != 5 && oldstate != 8)
        return 0;

    __u16 family = ctx->family;
    if (family != AF_INET)
        return 0;

    __u64 pid_tgid = bpf_get_current_pid_tgid();
    __u32 pid = pid_tgid >> 32;
    __u16 sport = ctx->sport;

    struct conn_key key = {
        .pid = pid,
        .src_port = sport,
    };

    struct conn_info *info = bpf_map_lookup_elem(&conn_map, &key);
    if (!info) {
        // Connection wasn't tracked (started before agent, or filtered)
        // Emit a partial event with what we know from the tracepoint
        struct flow_event *evt = bpf_ringbuf_reserve(&events, sizeof(*evt), 0);
        if (!evt)
            return 0;

        evt->pid = pid;
        evt->uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
        evt->src_ip = 0; // Will use tracepoint fields
        evt->dst_ip = 0;
        evt->src_port = sport;
        evt->dst_port = ctx->dport;
        evt->protocol = 6; // TCP
        evt->bytes_sent = 0;
        evt->bytes_received = 0;
        evt->timestamp_ns = bpf_ktime_get_ns();
        evt->duration_ns = 0;
        bpf_get_current_comm(&evt->comm, sizeof(evt->comm));

        // Try to read IPs from tracepoint args
        __builtin_memcpy(&evt->src_ip, ctx->saddr, 4);
        __builtin_memcpy(&evt->dst_ip, ctx->daddr, 4);

        bpf_ringbuf_submit(evt, 0);
        return 0;
    }

    // Emit complete flow event
    struct flow_event *evt = bpf_ringbuf_reserve(&events, sizeof(*evt), 0);
    if (!evt) {
        bpf_map_delete_elem(&conn_map, &key);
        return 0;
    }

    __u64 now = bpf_ktime_get_ns();

    evt->pid = info->pid;
    evt->uid = info->uid;
    evt->src_ip = info->src_ip;
    evt->dst_ip = info->dst_ip;
    evt->src_port = info->src_port;
    evt->dst_port = info->dst_port;
    evt->protocol = 6; // TCP
    evt->bytes_sent = 0;     // Byte counts updated in userspace via /proc or sock stats
    evt->bytes_received = 0; // eBPF can't easily track cumulative bytes on close
    evt->timestamp_ns = now;
    evt->duration_ns = now - info->start_ns;
    __builtin_memcpy(&evt->comm, &info->comm, TASK_COMM_LEN);

    bpf_ringbuf_submit(evt, 0);
    bpf_map_delete_elem(&conn_map, &key);

    return 0;
}

// -----------------------------------------------------------------------
// Kprobe: udp_sendmsg — capture outbound UDP flows
// UDP is connectionless, so we emit an event per sendmsg call.
// -----------------------------------------------------------------------
SEC("kprobe/udp_sendmsg")
int trace_udp_sendmsg(struct pt_regs *ctx)
{
    struct sock *sk = (struct sock *)PT_REGS_PARM1(ctx);
    if (!sk)
        return 0;

    __u16 family = BPF_CORE_READ(sk, __sk_common.skc_family);
    if (family != AF_INET)
        return 0;

    struct flow_event *evt = bpf_ringbuf_reserve(&events, sizeof(*evt), 0);
    if (!evt)
        return 0;

    __u64 pid_tgid = bpf_get_current_pid_tgid();

    evt->pid = pid_tgid >> 32;
    evt->uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    evt->src_ip = BPF_CORE_READ(sk, __sk_common.skc_rcv_saddr);
    evt->dst_ip = BPF_CORE_READ(sk, __sk_common.skc_daddr);
    evt->src_port = BPF_CORE_READ(sk, __sk_common.skc_num);
    evt->dst_port = bpf_ntohs(BPF_CORE_READ(sk, __sk_common.skc_dport));
    evt->protocol = 17; // UDP
    evt->bytes_sent = 0;
    evt->bytes_received = 0;
    evt->timestamp_ns = bpf_ktime_get_ns();
    evt->duration_ns = 0;
    bpf_get_current_comm(&evt->comm, sizeof(evt->comm));

    bpf_ringbuf_submit(evt, 0);
    return 0;
}

char _license[] SEC("license") = "GPL";
