module github.com/blmuffley/Pathfinder/src/agent/k8s

go 1.22

replace (
	github.com/blmuffley/Pathfinder/src/agent/shared => ../shared
	github.com/blmuffley/Pathfinder/src/proto => ../../proto
)

require (
	github.com/blmuffley/Pathfinder/src/agent/shared v0.0.0
	go.uber.org/zap v1.27.0
)

require (
	github.com/blmuffley/Pathfinder/src/proto v0.0.0 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/net v0.26.0 // indirect
	golang.org/x/sys v0.21.0 // indirect
	golang.org/x/text v0.16.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240624140628-dc46fd24d27d // indirect
	google.golang.org/grpc v1.65.0 // indirect
	google.golang.org/protobuf v1.34.2 // indirect
)
