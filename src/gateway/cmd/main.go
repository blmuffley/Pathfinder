package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Println("Pathfinder Gateway starting...")

	// TODO: Load config, start gRPC server, connect to PostgreSQL, start SN sync
	_ = os.Getenv("PF_DB_URL")
}
