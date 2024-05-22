package oidc

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// Config contains the OIDC config.
type Config struct {
	Issuer        string   `json:"issuer"`
	AuthURL       string   `json:"authorization_endpoint"`
	TokenURL      string   `json:"token_endpoint"`
	DeviceAuthURL string   `json:"device_authorization_endpoint"`
	JWKSURL       string   `json:"jwks_uri"`
	UserInfoURL   string   `json:"userinfo_endpoint"`
	Algorithms    []string `json:"id_token_signing_alg_values_supported"`
}

// GetConfig returns the OIDC config of a provider at the given issuer URL.
func GetConfig(ctx context.Context, issuer string) (Config, error) {
	wellKnown := strings.TrimSuffix(issuer, "/") + "/.well-known/openid-configuration"
	req, err := http.NewRequest("GET", wellKnown, nil)
	if err != nil {
		return Config{}, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Config{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return Config{}, fmt.Errorf("unable to read response body: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return Config{}, fmt.Errorf("%s: %s", resp.Status, body)
	}

	var result Config
	if err := json.Unmarshal(body, &result); err != nil {
		return Config{}, fmt.Errorf("failed to unmarshal JSON response: %w", err)
	}
	return result, nil
}
