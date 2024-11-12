package helm

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHelm(t *testing.T) {
	t.Parallel()

	instlr, err := NewInstaller("test-ns", "", ChartOptions{
		Directory: "../../data/testchart",
		Version:   "0.1.0",
	})
	require.NoError(t, err)

	ctx := context.Background()
	rendered, err := instlr.RenderTemplates(ctx, false, InstallArgs{
		ReleaseName: "test-release",
	})
	require.NoError(t, err)

	allFiles := rendered.Files()
	assert.Len(t, allFiles, 5)

	depls := rendered.FilterFiles("templates/deployment.yaml")
	assert.Len(t, depls, 1)

	svcs := rendered.FilterFiles("templates/service.yaml")
	assert.Len(t, svcs, 1)

	deplAndSvc := rendered.FilterFiles("templates/deployment.yaml", "templates/service.yaml")
	assert.Len(t, deplAndSvc, 2)

	none := rendered.FilterFiles("templates/doesnotexist.yaml")
	assert.Empty(t, none, 0)
}
