package classify

// PortRule maps a destination port to an integration type and subtype.
type PortRule struct {
	IntegrationType string
	Subtype         string
	Confidence      float64
}

// portRules maps well-known ports to classification rules.
// Priority 1: exact port match (confidence 0.90).
var portRules = map[uint32]PortRule{
	// API
	443:   {IntegrationType: "API", Subtype: "HTTPS", Confidence: 0.90},
	8443:  {IntegrationType: "API", Subtype: "HTTPS", Confidence: 0.90},
	80:    {IntegrationType: "API", Subtype: "HTTP", Confidence: 0.90},
	8080:  {IntegrationType: "API", Subtype: "HTTP", Confidence: 0.90},
	8081:  {IntegrationType: "API", Subtype: "HTTP", Confidence: 0.85},
	8888:  {IntegrationType: "API", Subtype: "HTTP", Confidence: 0.80},

	// Database
	5432:  {IntegrationType: "Database", Subtype: "PostgreSQL", Confidence: 0.90},
	3306:  {IntegrationType: "Database", Subtype: "MySQL", Confidence: 0.90},
	1433:  {IntegrationType: "Database", Subtype: "MSSQL", Confidence: 0.90},
	1521:  {IntegrationType: "Database", Subtype: "Oracle", Confidence: 0.90},
	27017: {IntegrationType: "Database", Subtype: "MongoDB", Confidence: 0.90},
	6379:  {IntegrationType: "Database", Subtype: "Redis", Confidence: 0.90},
	9042:  {IntegrationType: "Database", Subtype: "Cassandra", Confidence: 0.90},
	7687:  {IntegrationType: "Database", Subtype: "Neo4j", Confidence: 0.90},

	// Messaging
	5672:  {IntegrationType: "Messaging", Subtype: "RabbitMQ", Confidence: 0.90},
	15672: {IntegrationType: "Messaging", Subtype: "RabbitMQ-Mgmt", Confidence: 0.85},
	9092:  {IntegrationType: "Messaging", Subtype: "Kafka", Confidence: 0.90},
	61616: {IntegrationType: "Messaging", Subtype: "ActiveMQ", Confidence: 0.90},
	4222:  {IntegrationType: "Messaging", Subtype: "NATS", Confidence: 0.90},

	// File Transfer
	21:   {IntegrationType: "File Transfer", Subtype: "FTP", Confidence: 0.90},
	990:  {IntegrationType: "File Transfer", Subtype: "FTPS", Confidence: 0.90},

	// Email
	25:   {IntegrationType: "Email", Subtype: "SMTP", Confidence: 0.90},
	465:  {IntegrationType: "Email", Subtype: "SMTPS", Confidence: 0.90},
	587:  {IntegrationType: "Email", Subtype: "SMTP-Submission", Confidence: 0.90},
	143:  {IntegrationType: "Email", Subtype: "IMAP", Confidence: 0.90},
	993:  {IntegrationType: "Email", Subtype: "IMAPS", Confidence: 0.90},

	// Directory
	389:  {IntegrationType: "Directory", Subtype: "LDAP", Confidence: 0.90},
	636:  {IntegrationType: "Directory", Subtype: "LDAPS", Confidence: 0.90},

	// Remote Access
	3389: {IntegrationType: "Remote Access", Subtype: "RDP", Confidence: 0.90},
	5900: {IntegrationType: "Remote Access", Subtype: "VNC", Confidence: 0.90},

	// Port 22 is ambiguous — classified by process name in engine.go
	22: {IntegrationType: "Remote Access", Subtype: "SSH", Confidence: 0.85},
}

// processNameRules maps known process names to integration types.
// Priority 3: process name match (confidence 0.85).
var processNameRules = map[string]PortRule{
	"postgres":   {IntegrationType: "Database", Subtype: "PostgreSQL", Confidence: 0.85},
	"mysqld":     {IntegrationType: "Database", Subtype: "MySQL", Confidence: 0.85},
	"mongod":     {IntegrationType: "Database", Subtype: "MongoDB", Confidence: 0.85},
	"redis":      {IntegrationType: "Database", Subtype: "Redis", Confidence: 0.85},
	"redis-server": {IntegrationType: "Database", Subtype: "Redis", Confidence: 0.85},
	"sqlservr":   {IntegrationType: "Database", Subtype: "MSSQL", Confidence: 0.85},
	"nginx":      {IntegrationType: "API", Subtype: "HTTP", Confidence: 0.85},
	"httpd":      {IntegrationType: "API", Subtype: "HTTP", Confidence: 0.85},
	"apache2":    {IntegrationType: "API", Subtype: "HTTP", Confidence: 0.85},
	"envoy":      {IntegrationType: "API", Subtype: "gRPC-Proxy", Confidence: 0.85},
	"haproxy":    {IntegrationType: "API", Subtype: "HTTP-Proxy", Confidence: 0.85},
	"java":       {IntegrationType: "API", Subtype: "Java-App", Confidence: 0.70},
	"node":       {IntegrationType: "API", Subtype: "Node-App", Confidence: 0.70},
	"python":     {IntegrationType: "API", Subtype: "Python-App", Confidence: 0.70},
	"python3":    {IntegrationType: "API", Subtype: "Python-App", Confidence: 0.70},
	"dotnet":     {IntegrationType: "API", Subtype: "DotNet-App", Confidence: 0.70},
	"rabbitmq":   {IntegrationType: "Messaging", Subtype: "RabbitMQ", Confidence: 0.85},
	"beam.smp":   {IntegrationType: "Messaging", Subtype: "RabbitMQ", Confidence: 0.80},
	"kafka":      {IntegrationType: "Messaging", Subtype: "Kafka", Confidence: 0.85},
	"sshd":       {IntegrationType: "Remote Access", Subtype: "SSH", Confidence: 0.85},
	"sftp-server": {IntegrationType: "File Transfer", Subtype: "SFTP", Confidence: 0.90},
	"slapd":      {IntegrationType: "Directory", Subtype: "LDAP", Confidence: 0.85},
	"postfix":    {IntegrationType: "Email", Subtype: "SMTP", Confidence: 0.85},
	"sendmail":   {IntegrationType: "Email", Subtype: "SMTP", Confidence: 0.85},
	"dovecot":    {IntegrationType: "Email", Subtype: "IMAP", Confidence: 0.85},
}
