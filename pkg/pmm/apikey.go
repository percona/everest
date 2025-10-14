// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package pmm

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	goversion "github.com/hashicorp/go-version"
)

func newHTTPClient(insecure bool) *http.Client {
	client := http.DefaultClient
	client.Transport = &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: insecure, //nolint:gosec
		},
	}
	return client
}

// CreatePMMApiKey creates a new API key in PMM by using the provided username and password.
func CreatePMMApiKey(
	ctx context.Context,
	hostname, apiKeyName, user, password string,
	skipTLSVerify bool,
) (string, error) {
	version, err := getPMMVersion(ctx, hostname, user, password, skipTLSVerify)
	if err != nil {
		return "", err
	}

	if isPMM3(*version) {
		return createServiceAccountAndToken(ctx, hostname, apiKeyName, user, password, skipTLSVerify)
	} else {
		return createKey(ctx, hostname, apiKeyName, user, password, skipTLSVerify)
	}
}

func createKey(ctx context.Context, hostname, apiKeyName, user, password string, skipTLSVerify bool) (string, error) {
	body := nameAndRoleMap(apiKeyName)
	resp, err := doJSONRequest[map[string]interface{}](ctx, http.MethodPost, fmt.Sprintf("%s/graph/api/auth/keys", hostname), user, password, body, skipTLSVerify)
	if err != nil {
		return "", err
	}
	key, ok := resp["key"].(string)
	if !ok {
		return "", errors.New("cannot unmarshal key in createAdminToken")
	}
	return key, nil
}

func createServiceAccountAndToken(ctx context.Context, hostname, apiKeyName, user, password string, skipTLSVerify bool) (string, error) {
	// let's use the same name for the service account and the token
	nameAndRole := nameAndRoleMap(apiKeyName)
	account, err := doJSONRequest[struct {
		Uid string `json:"uid"`
	}](ctx, http.MethodPost, fmt.Sprintf("%s/graph/api/serviceaccounts", hostname), user, password, nameAndRole, skipTLSVerify)
	if err != nil {
		return "", err
	}
	token, err := doJSONRequest[struct {
		Key string `json:"key"`
	}](ctx, http.MethodPost, fmt.Sprintf("%s/graph/api/serviceaccounts/%s/tokens", hostname, account.Uid), user, password, nameAndRole, skipTLSVerify)
	if err != nil {
		return "", err
	}

	return token.Key, nil
}

func isPMM3(version goversion.Version) bool {
	segments := version.Segments()
	return len(segments) > 0 && segments[0] == 3
}

func getPMMVersion(ctx context.Context, hostname, user, password string, skipTLSVerify bool) (*goversion.Version, error) {
	resp, err := doJSONRequest[struct {
		Version string `json:"version"`
	}](ctx, http.MethodGet, fmt.Sprintf("%s/v1/version", hostname), user, password, "", skipTLSVerify)
	if err != nil {
		return nil, err
	}
	return goversion.NewVersion(resp.Version)
}

func doJSONRequest[T any](ctx context.Context, method, url, user, password string, body any, skipTLSVerify bool) (T, error) {
	var zero T
	b, err := json.Marshal(body)
	if err != nil {
		return zero, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(b))
	if err != nil {
		return zero, fmt.Errorf("build request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.SetBasicAuth(user, password)
	req.Close = true

	httpClient := newHTTPClient(skipTLSVerify)
	resp, err := httpClient.Do(req)
	if err != nil {
		return zero, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return zero, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode >= http.StatusBadRequest {
		var pmmErr *pmmErrorMessage
		if err := json.Unmarshal(data, &pmmErr); err != nil {
			return zero, errors.Join(err, fmt.Errorf("PMM returned an unknown error. HTTP %d", resp.StatusCode))
		}
		return zero, fmt.Errorf("PMM returned an error: %s", pmmErr.Message)
	}

	var result T
	if err := json.Unmarshal(data, &result); err != nil {
		return zero, fmt.Errorf("unmarshal response: %w", err)
	}

	return result, nil
}

func nameAndRoleMap(name string) map[string]string {
	return map[string]string{
		"name": name,
		"role": "Admin",
	}
}
