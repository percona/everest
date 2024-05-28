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
				OIDC: OIDCConfig{
					IssuerURL: "url",
					ClientID:  "id",
				},
			},
			expected: map[string]string{"oidc": "issuerUrl: url\nclientId: id\n"},
		},
		{
			name: "empty oidc",
			input: EverestSettings{
				OIDC: OIDCConfig{
					IssuerURL: "",
					ClientID:  "",
				},
			},
			expected: map[string]string{"oidc": "issuerUrl: \"\"\nclientId: \"\"\n"},
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
				OIDC: OIDCConfig{
					IssuerURL: "url",
					ClientID:  "id",
				},
			},
			input: map[string]string{"oidc": "issuerUrl: url\nclientId: id\n"},
		},
		{
			name: "extra key",
			expected: EverestSettings{
				OIDC: OIDCConfig{
					IssuerURL: "url",
					ClientID:  "id",
				},
			},
			input: map[string]string{"oidc": "issuerUrl: url\nclientId: id\nextraKey: value\n"},
		},
		{
			name: "missing key",
			expected: EverestSettings{
				OIDC: OIDCConfig{
					IssuerURL: "url",
					ClientID:  "",
				},
			},
			input: map[string]string{"oidc": "issuerUrl: url\n"},
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
