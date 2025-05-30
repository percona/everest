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

package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseValues(t *testing.T) {
	in := map[string]interface{}{
		"server": map[string]interface{}{
			"tls": map[string]interface{}{
				"enabled": true,
			},
			"service": map[string]interface{}{
				"name": "test",
				"port": 8080,
			},
		},
	}

	result, err := ParseValues(in)
	require.NoError(t, err)
	assert.Equal(t, result.Server.TLS.Enabled, true)
	assert.Equal(t, result.Server.Service.Name, "test")
	assert.Equal(t, result.Server.Service.Port, 8080)
}
