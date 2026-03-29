package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server         ServerConfig         `yaml:"server"`
	Database       DatabaseConfig       `yaml:"database"`
	ServiceNow     ServiceNowConfig     `yaml:"servicenow"`
	Classification ClassificationConfig `yaml:"classification"`
	Enrollment     EnrollmentConfig     `yaml:"enrollment"`
	Logging        LoggingConfig        `yaml:"logging"`
}

type ServerConfig struct {
	Port     int    `yaml:"port"`
	TLS      bool   `yaml:"tls"`
	CertFile string `yaml:"cert_file"`
	KeyFile  string `yaml:"key_file"`
	CAFile   string `yaml:"ca_file"`
}

type DatabaseConfig struct {
	URL            string `yaml:"url"`
	MaxConnections int    `yaml:"max_connections"`
	MigrationDir   string `yaml:"migration_dir"`
}

type ServiceNowConfig struct {
	Instance     string        `yaml:"instance"`
	Auth         string        `yaml:"auth"`
	ClientID     string        `yaml:"client_id"`
	ClientSecret string        `yaml:"client_secret"`
	SyncInterval time.Duration `yaml:"sync_interval"`
	BatchSize    int           `yaml:"batch_size"`
}

type ClassificationConfig struct {
	ConfidenceThreshold float64 `yaml:"confidence_threshold"`
	DedupWindow         time.Duration `yaml:"dedup_window"`
}

type EnrollmentConfig struct {
	TokenSecret string `yaml:"token_secret"`
}

type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
}

// Load reads the YAML config file and applies environment variable overrides.
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config %s: %w", path, err)
	}

	cfg := &Config{
		Server: ServerConfig{
			Port: 8443,
		},
		Database: DatabaseConfig{
			MaxConnections: 25,
			MigrationDir:   "internal/store/migrations",
		},
		ServiceNow: ServiceNowConfig{
			SyncInterval: 60 * time.Second,
			BatchSize:    50,
		},
		Classification: ClassificationConfig{
			ConfidenceThreshold: 0.8,
			DedupWindow:         5 * time.Minute,
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
	if v := os.Getenv("PF_DB_URL"); v != "" {
		cfg.Database.URL = v
	}
	if v := os.Getenv("PF_SN_INSTANCE"); v != "" {
		cfg.ServiceNow.Instance = v
	}
	if v := os.Getenv("PF_SN_CLIENT_ID"); v != "" {
		cfg.ServiceNow.ClientID = v
	}
	if v := os.Getenv("PF_SN_CLIENT_SECRET"); v != "" {
		cfg.ServiceNow.ClientSecret = v
	}
	if v := os.Getenv("PF_ENROLLMENT_TOKEN_SECRET"); v != "" {
		cfg.Enrollment.TokenSecret = v
	}

	if cfg.Database.URL == "" {
		return nil, fmt.Errorf("database.url is required (set in config or PF_DB_URL env)")
	}

	return cfg, nil
}
