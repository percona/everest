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
