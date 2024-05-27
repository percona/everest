package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToMap(t *testing.T) {
	t.Parallel()
	type testCase struct {
		name     string
		input    EverestSettings
		expected map[string]string
	}

	testCases := []testCase{
		{
			name: "correct",
			input: EverestSettings{
				OIDCIssuerURL: "url",
				OIDCClientID:  "id",
			},
			expected: map[string]string{"oidc_issuer_url": "url", "oidc_client_id": "id"},
		},
		{
			name: "empty oidc",
			input: EverestSettings{
				OIDCIssuerURL: "",
				OIDCClientID:  "",
			},
			expected: map[string]string{"oidc_issuer_url": "", "oidc_client_id": ""},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			res, err := tc.input.ToMap()
			require.NoError(t, err)
			assert.Equal(t, tc.expected, res)
		})
	}
}

func TestFromMap(t *testing.T) {
	t.Parallel()
	type testCase struct {
		name     string
		input    map[string]string
		expected EverestSettings
	}

	testCases := []testCase{
		{
			name: "correct",
			expected: EverestSettings{
				OIDCIssuerURL: "url",
				OIDCClientID:  "id",
			},
			input: map[string]string{"oidc_issuer_url": "url", "oidc_client_id": "id"},
		},
		{
			name: "extra key",
			expected: EverestSettings{
				OIDCIssuerURL: "url",
				OIDCClientID:  "id",
			},
			input: map[string]string{"oidc_issuer_url": "url", "oidc_client_id": "id", "extra-key": "key"},
		},
		{
			name: "missing key",
			expected: EverestSettings{
				OIDCIssuerURL: "url",
				OIDCClientID:  "",
			},
			input: map[string]string{"oidc_issuer_url": "url"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			result := EverestSettings{}
			err := result.FromMap(tc.input)
			require.NoError(t, err)
			assert.Equal(t, tc.expected, result)
		})
	}
}
