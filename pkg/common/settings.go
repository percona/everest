package common

import "gopkg.in/yaml.v3"

// EverestSettings represents the flat list of everest settings.
// It's supposed to have only the string fields to be consistently parsed to a map.
type EverestSettings struct {
	OIDCIssuerURL string `yaml:"oidcIssuerUrl"`
	OIDCClientID  string `yaml:"oidcClientId"`
}

// ToMap converts the EverestSettings struct to a map struct.
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

// FromMap tries to convert a map the EverestSettings struct.
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
