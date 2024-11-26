package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"helm.sh/helm/v3/pkg/cli/values"
)

func TestMergeVals(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		flagsOpt values.Options
		mapOpt   map[string]string
		merged   map[string]interface{}
	}{
		{
			flagsOpt: values.Options{
				Values: []string{
					"key1=val1",
					"key2.enabled=true",
				},
			},
			merged: map[string]interface{}{
				"key1": "val1",
				"key2": map[string]interface{}{
					"enabled": true,
				},
			},
		},
		{
			flagsOpt: values.Options{
				Values: []string{
					"key1=val1",
					"key2.enabled=true",
				},
			},
			mapOpt: map[string]string{
				"key2.enabled": "false",
			},
			merged: map[string]interface{}{
				"key1": "val1",
				"key2": map[string]interface{}{
					"enabled": true,
				},
			},
		},
		{
			flagsOpt: values.Options{
				Values: []string{
					"key1=val1",
					"key2.enabled=true",
				},
			},
			mapOpt: map[string]string{
				"key3.subkey": "value3",
			},
			merged: map[string]interface{}{
				"key1": "val1",
				"key2": map[string]interface{}{
					"enabled": true,
				},
				"key3": map[string]interface{}{
					"subkey": "value3",
				},
			},
		},
	}

	for _, tc := range testCases {
		merged, err := MergeVals(tc.flagsOpt, tc.mapOpt)
		require.NoError(t, err)
		assert.Equal(t, tc.merged, merged)
	}
}
