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
package api

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBuildProxiedUrl(t *testing.T) {
	t.Parallel()
	type tCase struct {
		url      string
		kind     string
		name     string
		expected string
	}

	cases := []tCase{
		{
			url:      "/v1/namespaces/some-ns/database-clusters",
			kind:     "databaseclusters",
			name:     "",
			expected: "/apis/everest.percona.com/v1alpha1/namespaces/everest/databaseclusters",
		},
		{
			url:      "/v1/namespaces/some-ns/database-clusters/snake_case_name",
			kind:     "databaseclusters",
			name:     "snake_case_name",
			expected: "/apis/everest.percona.com/v1alpha1/namespaces/everest/databaseclusters/snake_case_name",
		},
		{
			url:      "/v1/namespaces/some-ns/database-clusters/kebab-case-name",
			kind:     "databaseclusters",
			name:     "kebab-case-name",
			expected: "/apis/everest.percona.com/v1alpha1/namespaces/everest/databaseclusters/kebab-case-name",
		},
		{
			url:      "/v1/namespaces/some-ns/database-cluster-restores/kebab-case-name",
			kind:     "databaseclusterrestores",
			name:     "kebab-case-name",
			expected: "/apis/everest.percona.com/v1alpha1/namespaces/everest/databaseclusterrestores/kebab-case-name",
		},
	}

	for _, testCase := range cases {
		tc := testCase
		t.Run(tc.url, func(t *testing.T) {
			t.Parallel()
			require.Equal(t, tc.expected, buildProxiedURL("everest", tc.kind, tc.name))
		})
	}
}
