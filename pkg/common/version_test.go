package common

import (
	"testing"

	goversion "github.com/hashicorp/go-version"
	"github.com/stretchr/testify/assert"
)

func TestCompareVersions(t *testing.T) {
	t.Parallel()

	assert.Equal(t, int(0), CompareVersions("1.0.0", "1.0.0"))
	assert.Equal(t, int(0), CompareVersions("1.0.0", goversion.Must(goversion.NewVersion("1.0.0"))))
	assert.Equal(t, int(0), CompareVersions("1.0.0-rc1", goversion.Must(goversion.NewVersion("1.0.0"))))
	assert.Equal(t, int(1), CompareVersions("1.0.0", "0.9.0"))
	assert.Equal(t, int(1), CompareVersions("1.0.0", goversion.Must(goversion.NewVersion("0.9.0"))))
	assert.Equal(t, int(1), CompareVersions(goversion.Must(goversion.NewVersion("1.0.0")), "0.10.1"))
	assert.Equal(t, int(1), CompareVersions(goversion.Must(goversion.NewVersion("1.0.0-rc1")), "0.10.1"))
	assert.Equal(t, int(-1), CompareVersions("1.0.0", "1.1.0"))
	assert.Equal(t, int(-1), CompareVersions("1.0.0", goversion.Must(goversion.NewVersion("1.1.0"))))
	assert.Equal(t, int(-1), CompareVersions("1.0.0-rc1", goversion.Must(goversion.NewVersion("1.1.0"))))
}
