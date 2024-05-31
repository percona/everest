package install

import (
	"testing"

	versionpb "github.com/Percona-Lab/percona-version-service/versionpb"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateNamespaces(t *testing.T) {
	t.Parallel()

	type tcase struct {
		name   string
		input  string
		output []string
		error  error
	}

	tcases := []tcase{
		{
			name:   "empty string",
			input:  "",
			output: nil,
			error:  ErrNSEmpty,
		},
		{
			name:   "several empty strings",
			input:  "   ,   ,",
			output: nil,
			error:  ErrNSEmpty,
		},
		{
			name:   "correct",
			input:  "aaa,bbb,ccc",
			output: []string{"aaa", "bbb", "ccc"},
			error:  nil,
		},
		{
			name: "correct with spaces",
			input: `    aaa, bbb 
,ccc   `,
			output: []string{"aaa", "bbb", "ccc"},
			error:  nil,
		},
		{
			name:   "reserved system ns",
			input:  "everest-system",
			output: nil,
			error:  ErrNSReserved("everest-system"),
		},
		{
			name:   "reserved system ns and empty ns",
			input:  "everest-system,    ",
			output: nil,
			error:  ErrNSReserved("everest-system"),
		},
		{
			name:   "reserved monitoring ns",
			input:  "everest-monitoring",
			output: nil,
			error:  ErrNSReserved("everest-monitoring"),
		},
		{
			name:   "reserved olm ns",
			input:  "everest-olm",
			output: nil,
			error:  ErrNSReserved("everest-olm"),
		},
		{
			name:   "duplicated ns",
			input:  "aaa,bbb,aaa",
			output: []string{"aaa", "bbb"},
			error:  nil,
		},
		{
			name:   "name is too long",
			input:  "e1234567890123456789012345678901234567890123456789012345678901234567890,bbb",
			output: nil,
			error:  ErrNameNotRFC1035Compatible("e1234567890123456789012345678901234567890123456789012345678901234567890"),
		},
		{
			name:   "name starts with number",
			input:  "1aaa,bbb",
			output: nil,
			error:  ErrNameNotRFC1035Compatible("1aaa"),
		},
		{
			name:   "name contains special characters",
			input:  "aa12a,b$s",
			output: nil,
			error:  ErrNameNotRFC1035Compatible("b$s"),
		},
	}

	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			output, err := ValidateNamespaces(tc.input)
			assert.Equal(t, tc.error, err)
			assert.ElementsMatch(t, tc.output, output)
		})
	}
}

func TestInstall_latestVersion(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name            string
		providedVersion string
		meta            *versionpb.MetadataResponse
		expectVersion   string
		expectError     bool
	}{
		{
			name: "Installs the latest version",
			meta: &versionpb.MetadataResponse{
				Versions: []*versionpb.MetadataVersion{
					{Version: "0.8.0"},
					{Version: "0.10.0"},
					{Version: "0.9.0"},
				},
			},
			expectVersion: "0.10.0",
		},
		{
			name: "Installs the latest version if only one version",
			meta: &versionpb.MetadataResponse{
				Versions: []*versionpb.MetadataVersion{
					{Version: "0.10.0"},
				},
			},
			expectVersion: "0.10.0",
		},
		{
			name: "Installs the target version",
			meta: &versionpb.MetadataResponse{
				Versions: []*versionpb.MetadataVersion{
					{Version: "0.8.0"},
					{Version: "0.11.0"},
					{Version: "0.10.0"},
					{Version: "0.9.0"},
				},
			},
			providedVersion: "0.10.0",
			expectVersion:   "0.10.0",
		},
		{
			name: "Fails if target version is not available",
			meta: &versionpb.MetadataResponse{
				Versions: []*versionpb.MetadataVersion{
					{Version: "0.8.0"},
					{Version: "0.11.0"},
					{Version: "0.10.0"},
					{Version: "0.9.0"},
				},
			},
			providedVersion: "0.12.0",
			expectError:     true,
		},
		{
			name: "Fails on invalid version",
			meta: &versionpb.MetadataResponse{
				Versions: []*versionpb.MetadataVersion{
					{Version: "0.8.0"},
					{Version: "0.11.0"},
					{Version: "0.10.0"},
					{Version: "0.9.0"},
				},
			},
			providedVersion: "abcd",
			expectError:     true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			i := &Install{
				config: Config{
					Version: tc.providedVersion,
				},
			}

			v, _, err := i.latestVersion(tc.meta)
			if tc.expectError {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, v.String(), tc.expectVersion)
		})
	}
}
