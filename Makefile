.PHONY: all build test clean

all: build

# --- Build targets ---
build: build-gateway build-agent-linux

build-gateway:
	cd src/gateway && go build -o ../../bin/pathfinder-gateway ./cmd/

build-agent-linux:
	cd src/agent/linux && make build

# --- Test targets ---
test: test-gateway test-agent-linux test-intelligence

test-gateway:
	cd src/gateway && go test ./... -cover

test-agent-linux:
	cd src/agent/linux && go test ./... -cover

test-intelligence:
	cd src/intelligence && python -m pytest --cov

test-integration:
	docker-compose up -d
	cd src/gateway && go test -tags=integration ./...
	cd src/intelligence && python -m pytest -m integration --cov

# --- Docker targets ---
docker-gateway:
	docker build -t pathfinder-gateway -f src/gateway/Dockerfile .

docker-agent:
	docker build -t pathfinder-agent -f src/agent/linux/Dockerfile .

# --- Clean ---
clean:
	rm -rf bin/
	cd src/gateway && go clean
	cd src/agent/linux && make clean 2>/dev/null || true
