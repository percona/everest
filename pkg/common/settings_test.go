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
				OIDCConfigRaw: "issuerUrl: url\nclientId: id\nscopes:\n- openid\n - profile\n - email\n - groups\n",
			},
			expected: map[string]string{"oidc.config": "issuerUrl: url\nclientId: id\nscopes:\n- openid\n - profile\n - email\n - groups\n"},
		},
		{
			name: "empty oidc",
			input: EverestSettings{
				OIDCConfigRaw: "issuerUrl: \"\"\nclientId: \"\"\nscopes: []\n",
			},
			expected: map[string]string{"oidc.config": "issuerUrl: \"\"\nclientId: \"\"\nscopes: []\n"},
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
				OIDCConfigRaw: "issuerUrl: url\nclientId: id\nscopes:\n- openid\n- profile\n- email\n- groups\n",
			},
			input: map[string]string{"oidc.config": "issuerUrl: url\nclientId: id\nscopes:\n- openid\n- profile\n- email\n- groups\n"},
		},
		{
			name: "extra key",
			expected: EverestSettings{
				OIDCConfigRaw: "issuerUrl: url\nclientId: id\nscopes:\n- openid\n- profile\n- email\n- groups\nextraKey: value\n",
			},
			input: map[string]string{"oidc.config": "issuerUrl: url\nclientId: id\nscopes:\n- openid\n- profile\n- email\n- groups\nextraKey: value\n"},
		},
		{
			name: "missing key",
			expected: EverestSettings{
				OIDCConfigRaw: "issuerUrl: url\n",
			},
			input: map[string]string{"oidc.config": "issuerUrl: url\n"},
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

func TestOIDCConfig(t *testing.T) {
	t.Parallel()
	type testCase struct {
		name      string
		rawConfig string
		expected  OIDCConfig
	}

	testCases := []testCase{
		{
			name: "correct",
			expected: OIDCConfig{
				IssuerURL: "url",
				ClientID:  "id",
				Scopes:    []string{"openid", "profile", "email", "groups"},
			},
			rawConfig: "issuerUrl: url\nclientId: id\nscopes:\n- openid\n- profile\n- email\n- groups\n",
		},
		{
			name: "extra key",
			expected: OIDCConfig{
				IssuerURL: "url",
				ClientID:  "id",
				Scopes:    []string{"openid", "profile", "email", "groups"},
			},
			rawConfig: "issuerUrl: url\nclientId: id\nscopes:\n- openid\n- profile\n- email\n- groups\nextraKey: value\n",
		},
		{
			name: "missing key",
			expected: OIDCConfig{
				IssuerURL: "url",
				ClientID:  "",
				Scopes:    DefaultOIDCScopes,
			},
			rawConfig: "issuerUrl: url\n",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			settings := EverestSettings{OIDCConfigRaw: tc.rawConfig}
			config, err := settings.OIDCConfig()
			require.NoError(t, err)
			assert.Equal(t, tc.expected, config)
		})
	}
}
