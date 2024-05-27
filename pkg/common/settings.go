package common

import (
	"gopkg.in/yaml.v3"
)

type EverestSettings struct {
	OIDCIssuerURL string `yaml:"oidc_issuer_url"`
	OIDCClientID  string `yaml:"oidc_client_id"`
}

func (e *EverestSettings) ToMap() (map[string]string, error) {
	bytes, err := yaml.Marshal(e)
	if err != nil {
		return nil, err
	}
	result := make(map[string]string)
	err = yaml.Unmarshal(bytes, &result)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (e *EverestSettings) FromMap(m map[string]string) error {
	str, err := yaml.Marshal(m)
	if err != nil {
		return err
	}

	err = yaml.Unmarshal(str, e)
	if err != nil {
		return err
	}
	return nil
}
