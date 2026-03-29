// Minimal vmlinux.h for Pathfinder eBPF programs.
// On a real build system, generate with: bpftool btf dump file /sys/kernel/btf/vmlinux format c
// This file provides only the types needed by flow_tracker.c.

#ifndef __VMLINUX_H__
#define __VMLINUX_H__

typedef unsigned char __u8;
typedef unsigned short __u16;
typedef unsigned int __u32;
typedef unsigned long long __u64;
typedef signed char __s8;
typedef signed short __s16;
typedef signed int __s32;
typedef signed long long __s64;

typedef __u16 __be16;
typedef __u32 __be32;

// Forward declarations
struct sock;
struct sk_buff;
struct pt_regs;

// Socket common fields (subset)
struct sock_common {
    union {
        struct {
            __be32 skc_daddr;
            __be32 skc_rcv_saddr;
        };
    };
    union {
        struct {
            __be16 skc_dport;
            __u16 skc_num;
        };
    };
    short unsigned int skc_family;
} __attribute__((preserve_access_index));

struct sock {
    struct sock_common __sk_common;
} __attribute__((preserve_access_index));

// pt_regs for kprobes (x86_64)
#ifndef __TARGET_ARCH_x86
#define __TARGET_ARCH_x86
#endif

struct pt_regs {
    unsigned long r15;
    unsigned long r14;
    unsigned long r13;
    unsigned long r12;
    unsigned long bp;
    unsigned long bx;
    unsigned long r11;
    unsigned long r10;
    unsigned long r9;
    unsigned long r8;
    unsigned long ax;
    unsigned long cx;
    unsigned long dx;
    unsigned long si;
    unsigned long di;
    unsigned long orig_ax;
    unsigned long ip;
    unsigned long cs;
    unsigned long flags;
    unsigned long sp;
    unsigned long ss;
} __attribute__((preserve_access_index));

// Tracepoint context for tcp events
struct trace_event_raw_tcp_event_sk_skb_tcp {
    unsigned long long pad;
    const void *skaddr;
    __u16 sport;
    __u16 dport;
    __u16 family;
    __u8 saddr[4];
    __u8 daddr[4];
    __u8 saddr_v6[16];
    __u8 daddr_v6[16];
} __attribute__((preserve_access_index));

// Tracepoint context for inet_sock_set_state
struct trace_event_raw_inet_sock_set_state {
    unsigned long long pad;
    const void *skaddr;
    int oldstate;
    int newstate;
    __u16 sport;
    __u16 dport;
    __u16 family;
    __u16 protocol;
    __u8 saddr[4];
    __u8 daddr[4];
    __u8 saddr_v6[16];
    __u8 daddr_v6[16];
} __attribute__((preserve_access_index));

#endif /* __VMLINUX_H__ */
