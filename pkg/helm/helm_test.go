package helm

// import (
// 	"context"
// 	"strings"
// 	"testing"

// 	"github.com/percona/everest/data/testchart"
// 	"github.com/stretchr/testify/assert"
// 	"github.com/stretchr/testify/require"
// )

// func TestRenderTemplates(t *testing.T) {
// 	instlr, err := NewInstaller("test-ns", "", ChartOptions{
// 		FS:      testchart.Chart,
// 		Version: "0.1.0",
// 	})
// 	require.NoError(t, err)

// 	ctx := context.Background()
// 	filesBytes, err := instlr.RenderTemplates(ctx, false, InstallArgs{
// 		ReleaseName: "test-release",
// 	})
// 	require.NoError(t, err)

// 	manifests := strings.Split(string(filesBytes), "---")
// 	assert.Equal(t, 5, len(manifests))
// }

// func TestFilterYAML(t *testing.T) {
// 	instlr, err := NewInstaller("test-ns", "", ChartOptions{
// 		FS:      testchart.Chart,
// 		Version: "0.1.0",
// 	})
// 	require.NoError(t, err)

// 	ctx := context.Background()
// 	filesBytes, err := instlr.RenderTemplates(ctx, false, InstallArgs{
// 		ReleaseName: "test-release",
// 	})
// 	require.NoError(t, err)

// 	filteredBytes, err := FilterYAML(filesBytes, "templates/service.yaml")
// 	require.NoError(t, err)
// 	manifests := strings.Split(string(filteredBytes), "---")
// 	assert.Equal(t, 1, len(manifests))

// 	filteredBytes, err = FilterYAML(filesBytes, "templates/deployment.yaml")
// 	require.NoError(t, err)
// 	manifests = strings.Split(string(filteredBytes), "---")
// 	assert.Equal(t, 1, len(manifests))

// 	filteredBytes, err = FilterYAML(filesBytes, "templates/deployment.yaml", "templates/service.yaml")
// 	require.NoError(t, err)
// 	manifests = strings.Split(string(filteredBytes), "---")
// 	assert.Equal(t, 2, len(manifests))

// 	filteredBytes, err = FilterYAML(filesBytes, "templates/doesnotexist.yaml")
// 	require.NoError(t, err)
// 	assert.Len(t, filteredBytes, 0)
// }
