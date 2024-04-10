package version

import (
	"fmt"
	"testing"

	goversion "github.com/hashicorp/go-version"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCatalogImage(t *testing.T) {
	t.Parallel()
	Version = "v0.3.0"
	v, err := goversion.NewVersion(Version)
	require.NoError(t, err)
	assert.Equal(t, fmt.Sprintf(releaseCatalogImage, v.String()), CatalogImage(v))

	Version = "v0.3.0-1-asd-dirty"
	v, err = goversion.NewVersion(Version)
	require.NoError(t, err)
	assert.Equal(t, devCatalogImage, CatalogImage(v))

	Version = "0.3.0-37-gf1f07f6"
	v, err = goversion.NewVersion(Version)
	require.NoError(t, err)
	assert.Equal(t, devCatalogImage, CatalogImage(v))
}

func TestVersion_devVersion(t *testing.T) {
	t.Parallel()

	testcases := []struct {
		name      string
		version   string
		expectDev bool
	}{
		{
			name:      "public version",
			version:   "1.0.0",
			expectDev: false,
		},
		{
			name:      "rc version",
			version:   "1.0.0-rc2",
			expectDev: false,
		},
		{
			name:      "empty version",
			version:   "",
			expectDev: true,
		},
		{
			name:      "upgrade-test version",
			version:   "1.0.0-hash-upgrade-test",
			expectDev: false,
		},
		{
			name:      "dev version",
			version:   "1.0.0-any-suffix",
			expectDev: true,
		},
		{
			name:      "dev-latest version",
			version:   "0.0.0-hash",
			expectDev: true,
		},
	}

	for _, tt := range testcases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			dev := isDevVersion(tt.version)
			assert.Equal(t, tt.expectDev, dev)
		})
	}
}
