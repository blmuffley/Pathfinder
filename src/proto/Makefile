.PHONY: generate clean

generate:
	protoc \
		--go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		pathfinder.proto

clean:
	rm -f *.pb.go
