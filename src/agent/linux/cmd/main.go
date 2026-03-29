package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Println("Pathfinder Agent (Linux) starting...")

	// TODO: Load eBPF program, start flow capture, connect to gateway
	_ = os.Getenv("PF_GATEWAY_ADDRESS")
}
