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

package upgrade

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	version "github.com/Percona-Lab/percona-version-service/versionpb"
	"github.com/percona/percona-everest-backend/client"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

func TestUpgrade_canUpgrade(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		everestVersion string
		versionMeta    *version.MetadataResponse
		wantErrIs      error
		wantUpgradeTo  string
	}{
		{
			name:           "upgrade by only one minor version",
			everestVersion: "0.6.0",
			versionMeta: &version.MetadataResponse{
				Versions: []*version.MetadataVersion{
					{Version: "0.5.0"},
					{Version: "0.6.0"},
					{Version: "0.7.0"},
					{Version: "0.8.0"},
				},
			},
			wantUpgradeTo: "0.7.0",
		},
		{
			name:           "upgrade by one version to the latest",
			everestVersion: "0.6.0",
			versionMeta: &version.MetadataResponse{
				Versions: []*version.MetadataVersion{
					{Version: "0.5.0"},
					{Version: "0.6.0"},
					{Version: "0.7.0"},
				},
			},
			wantUpgradeTo: "0.7.0",
		},
		{
			name:           "no update is available",
			everestVersion: "0.7.0",
			versionMeta: &version.MetadataResponse{
				Versions: []*version.MetadataVersion{
					{Version: "0.5.0"},
					{Version: "0.6.0"},
					{Version: "0.7.0"},
				},
			},
			wantErrIs: ErrNoUpdateAvailable,
		},
		{
			name:           "select latest patch version",
			everestVersion: "0.6.0",
			versionMeta: &version.MetadataResponse{
				Versions: []*version.MetadataVersion{
					{Version: "0.5.0"},
					{Version: "0.6.0"},
					{Version: "0.7.0"},
					{Version: "0.7.1"},
					{Version: "0.7.2"},
					{Version: "0.8.0"},
				},
			},
			wantUpgradeTo: "0.7.2",
		},
		{
			name:           "ignore invalid version",
			everestVersion: "0.6.0",
			versionMeta: &version.MetadataResponse{
				Versions: []*version.MetadataVersion{
					{Version: "0.5.0"},
					{Version: "0.6.0"},
					{Version: "invalid version"},
					{Version: "0.7.0"},
				},
			},
			wantUpgradeTo: "0.7.0",
		},
		{
			name:           "descending version order shall work",
			everestVersion: "0.6.0",
			versionMeta: &version.MetadataResponse{
				Versions: []*version.MetadataVersion{
					{Version: "0.8.0"},
					{Version: "0.7.0"},
					{Version: "0.6.0"},
					{Version: "0.5.0"},
				},
			},
			wantUpgradeTo: "0.7.0",
		},
	}
	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				b, err := json.Marshal(tt.versionMeta)
				if err != nil {
					w.WriteHeader(http.StatusInternalServerError)
					return
				}

				w.Header().Add("content-type", "application/json")
				w.Write(b)
			}))
			defer ts.Close()

			ecl := newMockEverestClientConnector(t)
			ecl.On("Version", mock.Anything).Return(&client.Version{Version: tt.everestVersion}, nil)

			u := &Upgrade{
				l: zap.L().Sugar(),
				config: &UpgradeConfig{
					VersionMetadataURL: ts.URL,
				},
				everestClient: ecl,
			}
			upgradeTo, _, err := u.canUpgrade(context.Background())
			if err != nil && !errors.Is(err, tt.wantErrIs) {
				t.Errorf("error = %v, wantErrIs %v", err, tt.wantErrIs)
				return
			}

			if err != nil {
				return
			}

			assert.Equal(t, tt.wantUpgradeTo, upgradeTo.String())
		})
	}
}
