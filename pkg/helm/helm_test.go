package helm

import (
	"context"
	"io"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"helm.sh/helm/v3/pkg/action"
	kubefake "helm.sh/helm/v3/pkg/kube/fake"
)

func TestHelm(t *testing.T) {
	t.Parallel()

	testNs := "test-ns"

	// initialise a mock configuration.
	cfg := action.Configuration{}
	cfg.Init(nil, testNs, "memory", nil)
	cfg.KubeClient = &kubefake.PrintingKubeClient{Out: io.Discard}

	instlr, err := NewInstaller(testNs, "", ChartOptions{
		Directory: "../../data/testchart",
		Version:   "0.1.0",
	})
	require.NoError(t, err)
	instlr.actionsCfg = &cfg

	ctx := context.Background()
	rendered, err := instlr.RenderTemplates(ctx, false, InstallArgs{
		ReleaseName: "test-release",
	})
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
