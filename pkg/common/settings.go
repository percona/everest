package common

import "gopkg.in/yaml.v3"

// EverestSettings represents the everest settings.
type EverestSettings struct {
	OIDC OIDCConfig
}

// OIDCConfig represents the OIDC provider configuration.
type OIDCConfig struct {
	IssuerURL string `yaml:"issuerUrl"`
	ClientID  string `yaml:"clientId"`
}

const oidcMapKey = "oidc"

// ToMap converts the EverestSettings struct to a map struct.
func (e *EverestSettings) ToMap() (map[string]string, error) {
	bytes, err := yaml.Marshal(e.OIDC)
	if err != nil {
		return nil, err
	}
	result := make(map[string]string)
	result[oidcMapKey] = string(bytes)
	return result, nil
}

// FromMap tries to convert a map the EverestSettings struct.
func (e *EverestSettings) FromMap(m map[string]string) error {
	err := yaml.Unmarshal([]byte(m[oidcMapKey]), &e.OIDC)
	if err != nil {
		return err
	}
	return nil
}
