module github.com/blmuffley/Pathfinder/tests/integration

go 1.22

replace github.com/blmuffley/Pathfinder/src/proto => ../../src/proto

require (
	github.com/blmuffley/Pathfinder/src/proto v0.0.0
	github.com/jackc/pgx/v5 v5.6.0
	google.golang.org/grpc v1.65.0
)

require (
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	github.com/jackc/puddle/v2 v2.2.1 // indirect
	golang.org/x/crypto v0.24.0 // indirect
	golang.org/x/net v0.26.0 // indirect
	golang.org/x/sync v0.7.0 // indirect
	golang.org/x/sys v0.21.0 // indirect
	golang.org/x/text v0.16.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240624140628-dc46fd24d27d // indirect
	google.golang.org/protobuf v1.34.2 // indirect
)
