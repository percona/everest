package oidc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lestrrat-go/jwx/jwk"
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

// getConfig returns the OIDC config of a provider at the given issuer URL.
func getConfig(issuer string) (Config, error) {
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

// NewKeyFunc returns a new function for getting the public JWK keys
// from the OIDC provider at the given issuer URL.
func NewKeyFunc(ctx context.Context, issuer string) (jwt.Keyfunc, error) {
	if issuer == "" {
		return func(_ *jwt.Token) (interface{}, error) {
			return nil, errors.New("issuer url needs to be configured to use this keyFunc")
		}, nil
	}

	cfg, err := getConfig(issuer)
	if err != nil {
		return nil, errors.Join(err, errors.New("failed to get OIDC config"))
	}

	if cfg.JWKSURL == "" {
		return nil, errors.New("did not find jwks_uri in oidc config")
	}
	refresher := jwk.NewAutoRefresh(ctx)
	refresher.Configure(cfg.JWKSURL)

	return func(token *jwt.Token) (interface{}, error) {
		keySet, err := refresher.Fetch(ctx, cfg.JWKSURL)
		if err != nil {
			return nil, err
		}

		keyID, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("expecting JWT header to have a key ID in the kid field")
		}

		key, found := keySet.LookupKeyID(keyID)

		if !found {
			return nil, fmt.Errorf("unable to find key %q", keyID)
		}

		var pubkey interface{}
		if err := key.Raw(&pubkey); err != nil {
			return nil, fmt.Errorf("Unable to get the public key. Error: %s", err.Error())
		}
		return pubkey, nil
	}, nil
}
