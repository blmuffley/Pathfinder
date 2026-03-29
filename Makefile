.PHONY: all build test clean proto help

all: build

help:
	@echo "Pathfinder + Intelligence Platform"
	@echo ""
	@echo "  make build          Build all Go binaries"
	@echo "  make test           Run all unit tests (Go + Python)"
	@echo "  make test-all       Run unit + integration tests"
	@echo "  make proto          Regenerate protobuf Go code"
	@echo "  make docker-up      Start local PostgreSQL"
	@echo "  make docker-all     Start all services via docker-compose"
	@echo "  make dev-gateway    Run gateway in dev mode"
	@echo "  make dev-mock-agent Run mock agent against local gateway"
	@echo "  make clean          Remove build artifacts"

# --- Proto generation ---
proto:
	cd src/proto && make generate

# --- Build targets (Go) ---
build: build-gateway build-mock-agent build-agent-linux build-agent-windows build-agent-k8s

build-gateway:
	cd src/gateway && go build -o ../../bin/pathfinder-gateway ./cmd/

build-mock-agent:
	cd src/gateway && go build -o ../../bin/mock-agent ./cmd/mock-agent/

build-agent-linux:
	cd src/agent/linux && go build -o ../../../bin/pathfinder-agent-linux ./cmd/

build-agent-windows:
	cd src/agent/windows && go build -o ../../../bin/pathfinder-agent-windows ./cmd/

build-agent-k8s:
	cd src/agent/k8s && go build -o ../../../bin/pathfinder-agent-k8s ./cmd/

# --- Test targets ---
test: test-go test-python

test-go: test-gateway test-agent-linux
	@echo "All Go tests passed"

test-gateway:
	cd src/gateway && go test ./... -cover

test-agent-linux:
	cd src/agent/linux && go test ./... -cover

test-python: test-ai-engine test-integration-intelligence test-cmdb-ops test-service-map
	@echo "All Python tests passed"

test-ai-engine:
	cd src/intelligence/shared-ai-engine && python3 -m pytest tests/ -v --tb=short

test-integration-intelligence:
	cd src/intelligence/integration-intelligence && python3 -m pytest tests/ -v --tb=short

test-cmdb-ops:
	cd src/intelligence/cmdb-ops-agent && python3 -m pytest tests/ -v --tb=short

test-service-map:
	cd src/intelligence/service-map-suite && python3 -m pytest tests/ -v --tb=short

test-integration:
	docker-compose up -d postgres
	@echo "Waiting for PostgreSQL..."
	@sleep 3
	cd tests/integration && go mod tidy && go test -tags=integration -v -timeout 60s

test-all: test test-integration

# --- Docker targets ---
docker-up:
	docker-compose up -d postgres

docker-all:
	docker-compose up -d

docker-down:
	docker-compose down

docker-gateway:
	docker build -t pathfinder-gateway -f src/gateway/Dockerfile .

docker-agent:
	docker build -t pathfinder-agent -f src/agent/linux/Dockerfile .

# --- Dev shortcuts ---
dev-gateway: docker-up
	@sleep 2
	cd src/gateway && go run ./cmd/ --config ../../config/gateway-dev.yaml

dev-mock-agent:
	cd src/gateway && go run ./cmd/mock-agent/ --gateway localhost:8443 --rate 10 --interval 10s

dev-ai-engine:
	cd src/intelligence/shared-ai-engine && python3 main.py

dev-integration-intel:
	cd src/intelligence/integration-intelligence && python3 main.py

dev-cmdb-ops:
	cd src/intelligence/cmdb-ops-agent && python3 main.py

dev-service-map:
	cd src/intelligence/service-map-suite && python3 main.py

# --- Clean ---
clean:
	rm -rf bin/
	cd src/gateway && go clean
	cd src/agent/linux && make clean 2>/dev/null || true
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
