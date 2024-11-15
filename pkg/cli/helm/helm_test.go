package helm

import (
	"context"
	"io"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chartutil"
	kubefake "helm.sh/helm/v3/pkg/kube/fake"
)

func TestHelm_RenderTemplates(t *testing.T) {
	t.Parallel()

	testNs := "test-ns"

	// initialise a mock configuration.
	cfg := action.Configuration{}
	err := cfg.Init(nil, testNs, "memory", nil)
	require.NoError(t, err)
	cfg.KubeClient = &kubefake.PrintingKubeClient{Out: io.Discard}
	cfg.Capabilities = chartutil.DefaultCapabilities

	installer := Installer{
		ReleaseName:      "test-release",
		ReleaseNamespace: testNs,
	}
	err = installer.Init("", ChartOptions{
		Directory: "../../../data/testchart",
		Version:   "0.1.0",
	})
	require.NoError(t, err)
	installer.cfg = &cfg

	ctx := context.Background()
	rendered, err := installer.RenderTemplates(ctx, false)
	require.NoError(t, err)

	allFiles := rendered.Files()
	assert.Len(t, allFiles, 5)

	depls := rendered.Filter("templates/deployment.yaml").Files()
	assert.Len(t, depls, 1)

	svcs := rendered.Filter("templates/service.yaml").Files()
	assert.Len(t, svcs, 1)

	deplAndSvc := rendered.Filter("templates/deployment.yaml", "templates/service.yaml").Files()
	assert.Len(t, deplAndSvc, 2)

	none := rendered.Filter("templates/doesnotexist.yaml").Files()
	assert.Empty(t, none, 0)
}
