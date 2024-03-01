package version

import (
	"fmt"
	"testing"

	goversion "github.com/hashicorp/go-version"
	"github.com/stretchr/testify/assert"
)

func TestCatalogImage(t *testing.T) {
	t.Parallel()
	Version = "v0.3.0"
	v, err := goversion.NewVersion(Version)
	assert.NoError(t, err)
	assert.Equal(t, fmt.Sprintf(releaseCatalogImage, v.String()), CatalogImage(v))

	Version = "v0.3.0-1-asd-dirty"
	v, err = goversion.NewVersion(Version)
	assert.NoError(t, err)
	assert.Equal(t, devCatalogImage, CatalogImage(v))

	Version = "0.3.0-37-gf1f07f6"
	v, err = goversion.NewVersion(Version)
	assert.NoError(t, err)
	assert.Equal(t, devCatalogImage, CatalogImage(v))
}
