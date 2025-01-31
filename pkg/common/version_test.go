package common

import (
	"testing"

	goversion "github.com/hashicorp/go-version"
	"github.com/stretchr/testify/assert"
)

func TestCheckConstraints(t *testing.T) {
	t.Parallel()

	assert.True(t, CheckConstraint("1.0.0", ">= 1.0.0"))
	assert.True(t, CheckConstraint(goversion.Must(goversion.NewVersion("1.0.0")), ">= 0.9.0"))
	assert.True(t, CheckConstraint("1.0.0", ">= 0.9.0, < 1.1.0"))
	assert.True(t, CheckConstraint(goversion.Must(goversion.NewVersion("1.0.0")), ">= 0.9.0, < 1.0.1"))
	assert.False(t, CheckConstraint("1.0.0", "< 1.0.0"))
	assert.True(t, CheckConstraint("1.1.0", "~> 1.1.0"))
	assert.False(t, CheckConstraint("1.2.0", "~> 1.1.0"))
	assert.True(t, CheckConstraint("1.2.0-rc1", "~> 1.2.0"))
	assert.True(t, CheckConstraint("1.2.1-rc1", "~> 1.2.0"))
	assert.False(t, CheckConstraint("1.3.1-rc1", "~> 1.2.0"))
	assert.True(t, CheckConstraint("1.3.1-rc1", "> 1.2.0"))
}
