package common

import (
	"github.com/mitchellh/mapstructure"
	"gopkg.in/yaml.v3"
)

// EverestSettings represents the everest settings.
type EverestSettings struct {
	OIDCConfigRaw string `mapstructure:"oidc.config"`
}

// OIDCConfig represents the OIDC provider configuration.
type OIDCConfig struct {
	IssuerURL string `yaml:"issuerUrl"`
	ClientID  string `yaml:"clientId"`
}

// Raw converts the OIDCConfig struct to a raw YAML string.
func (c *OIDCConfig) Raw() (string, error) {
	raw, err := yaml.Marshal(c)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

// OIDCConfig returns the OIDCConfig struct from the raw string.
func (e *EverestSettings) OIDCConfig() (OIDCConfig, error) {
	var oidc OIDCConfig
	err := yaml.Unmarshal([]byte(e.OIDCConfigRaw), &oidc)
	if err != nil {
		return OIDCConfig{}, err
	}
	return oidc, nil
}

// ToMap converts the EverestSettings struct to a map struct.
func (e *EverestSettings) ToMap() (map[string]string, error) {
	result := make(map[string]string)
	if err := mapstructure.Decode(e, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// FromMap tries to convert a map the EverestSettings struct.
func (e *EverestSettings) FromMap(m map[string]string) error {
	return mapstructure.Decode(m, e)
}
