FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git

WORKDIR /build

# Copy proto module
COPY src/proto/go.mod src/proto/go.sum* src/proto/
COPY src/proto/*.go src/proto/

# Copy gateway module
COPY src/gateway/go.mod src/gateway/go.sum* src/gateway/
WORKDIR /build/src/gateway
RUN go mod download

COPY src/gateway/ /build/src/gateway/

RUN CGO_ENABLED=0 GOOS=linux go build -o /pathfinder-gateway ./cmd/

# --- Runtime ---
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /pathfinder-gateway /usr/local/bin/pathfinder-gateway

# Default config (override with mount or env vars)
COPY config/gateway-dev.yaml /etc/pathfinder/gateway.yaml

EXPOSE 8443

ENTRYPOINT ["pathfinder-gateway"]
CMD ["--config", "/etc/pathfinder/gateway.yaml"]
