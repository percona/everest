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

	"github.com/percona/everest/cmd/config"
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
	if config.Debug {
		return "test-api-key", nil
	}
	apiKey := map[string]string{
		"name": apiKeyName,
		"role": "Admin",
	}
	b, err := json.Marshal(apiKey)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("%s/graph/api/auth/keys", hostname),
		bytes.NewReader(b),
	)
	if err != nil {
		return "", err
	}
	req.Close = true
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.SetBasicAuth(user, password)

	httpClient := newHTTPClient(skipTLSVerify)
	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}

	defer resp.Body.Close() //nolint:errcheck
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode >= http.StatusBadRequest {
		var pmmErr *pmmErrorMessage
		if err := json.Unmarshal(data, &pmmErr); err != nil {
			return "", errors.Join(err, fmt.Errorf("PMM returned an unknown error. HTTP status code %d", resp.StatusCode))
		}
		return "", fmt.Errorf("PMM returned an error with message: %s", pmmErr.Message)
	}

	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil {
		return "", err
	}
	key, ok := m["key"].(string)
	if !ok {
		return "", errors.New("cannot unmarshal key in createAdminToken")
	}

	return key, nil
}
