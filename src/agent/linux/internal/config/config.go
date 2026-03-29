package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Gateway   GatewayConfig   `yaml:"gateway"`
	Capture   CaptureConfig   `yaml:"capture"`
	Heartbeat HeartbeatConfig `yaml:"heartbeat"`
	Logging   LoggingConfig   `yaml:"logging"`
}

type GatewayConfig struct {
	Address string `yaml:"address"`
	TLS     bool   `yaml:"tls"`
}

type CaptureConfig struct {
	Interface     string        `yaml:"interface"`
	BPFFilter     string        `yaml:"bpf_filter"`
	FlushInterval time.Duration `yaml:"flush_interval"`
	BatchSize     int           `yaml:"batch_size"`
	MockMode      bool          `yaml:"mock_mode"`
}

type HeartbeatConfig struct {
	Interval time.Duration `yaml:"interval"`
}

type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
}

// Load reads agent configuration from a YAML file with env var overrides.
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config %s: %w", path, err)
	}

	cfg := &Config{
		Gateway: GatewayConfig{
			Address: "localhost:8443",
		},
		Capture: CaptureConfig{
			Interface:     "any",
			FlushInterval: 10 * time.Second,
			BatchSize:     100,
		},
		Heartbeat: HeartbeatConfig{
			Interval: 30 * time.Second,
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "json",
		},
	}

	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	// Environment variable overrides
	if v := os.Getenv("PF_GATEWAY_ADDRESS"); v != "" {
		cfg.Gateway.Address = v
	}

	return cfg, nil
}
