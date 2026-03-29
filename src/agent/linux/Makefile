.PHONY: build build-ebpf clean test

# eBPF compilation (Linux only, requires clang + libbpf headers)
build-ebpf:
	clang -O2 -g -target bpf \
		-D__TARGET_ARCH_x86 \
		-I ebpf/ \
		-c ebpf/flow_tracker.c \
		-o ebpf/flow_tracker.o

# Generate Go bindings from compiled eBPF (Linux only)
generate: build-ebpf
	cd internal/capture && go generate ./...

# Build agent binary (works on macOS via stub)
build:
	go build -o ../../../bin/pathfinder-agent ./cmd/

# Run tests
test:
	go test ./... -cover -v

clean:
	rm -f ../../../bin/pathfinder-agent
	rm -f ebpf/*.o
	rm -f internal/capture/flowtracker_bpf*.go
	rm -f internal/capture/flowtracker_bpf*.o
