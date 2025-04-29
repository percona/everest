package utils

import (
	"encoding/json"
	"fmt"
)

// ServiceValues represents the configuration values for the Everest service.
type ServiceValues struct {
	Name string `json:"name" yaml:"name"`
	Port int    `json:"port" yaml:"port"`
}

// TLSValues represents the configuration values for the Everest server TLS.
type TLSValues struct {
	Enabled bool `json:"enabled" yaml:"enabled"`
}

// ServerValues represents the configuration values for the Everest server.
type ServerValues struct {
	TLS     TLSValues     `json:"tls" yaml:"tls"`
	Service ServiceValues `json:"service" yaml:"service"`
}

// Values represents all the known configuration values for the Everest Helm chart.
// Fields may be added here as needed.
type Values struct {
	Server ServerValues `json:"server" yaml:"server"`
}

// ParseValues parses the given values map into a Values struct.
func ParseValues(values map[string]interface{}) (*Values, error) {
	result := &Values{}
	jsonBytes, err := json.Marshal(values)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal values: %w", err)
	}
	if err := json.Unmarshal(jsonBytes, result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal values: %w", err)
	}
	return result, nil
}
