module github.com/blmuffley/Pathfinder/src/agent/linux

go 1.22

replace github.com/blmuffley/Pathfinder/src/proto => ../../proto

require (
	github.com/blmuffley/Pathfinder/src/proto v0.0.0
	github.com/cilium/ebpf v0.15.0
	go.uber.org/zap v1.27.0
	google.golang.org/grpc v1.65.0
	gopkg.in/yaml.v3 v3.0.1
)

require (
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/exp v0.0.0-20240613232115-7f521ea00fb8 // indirect
	golang.org/x/net v0.26.0 // indirect
	golang.org/x/sys v0.21.0 // indirect
	golang.org/x/text v0.16.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240624140628-dc46fd24d27d // indirect
	google.golang.org/protobuf v1.34.2 // indirect
)
