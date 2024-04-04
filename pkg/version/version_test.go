package version

import (
	"fmt"
	"strings"
	"testing"

	"gotest.tools/assert"
)

func TestCatalogImage(t *testing.T) {
	t.Parallel()
	Version = "v0.3.0"
	assert.Equal(t, CatalogImage(), fmt.Sprintf(releaseCatalogImage, strings.TrimPrefix(Version, "v")))
	Version = "v0.3.0-rc1"
	assert.Equal(t, CatalogImage(), fmt.Sprintf(rcCatalogImage, strings.TrimPrefix(Version, "v")))
	Version = "v0.0.0-1-asd-dirty"
	assert.Equal(t, CatalogImage(), devCatalogImage)
	Version = "c09550"
	assert.Equal(t, CatalogImage(), devCatalogImage)
}
