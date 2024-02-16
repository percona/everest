package version

import (
	"fmt"
	"testing"

	"gotest.tools/assert"
)

func TestCatalogImage(t *testing.T) {
	t.Parallel()
	Version = "v0.3.0"
	assert.Equal(t, CatalogImage(), fmt.Sprintf(releaseCatalogImage, Version))
	Version = "v0.3.0-1-asd-dirty"
	assert.Equal(t, CatalogImage(), devCatalogImage)
	Version = "c09550"
	assert.Equal(t, CatalogImage(), devCatalogImage)
	Version = "0.3.0-37-gf1f07f6"
	assert.Equal(t, CatalogImage(), devCatalogImage)
}
