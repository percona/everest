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

func getTestActionsConfig(ns string) (*action.Configuration, error) {
	cfg := action.Configuration{}
	err := cfg.Init(nil, ns, "memory", nil)
	if err != nil {
		return nil, err
	}
	cfg.KubeClient = &kubefake.PrintingKubeClient{Out: io.Discard}
	cfg.Capabilities = chartutil.DefaultCapabilities
	return &cfg, nil
}

func getTestHelmInstaller() (*Installer, error) {
	testNs := "test-ns"
	cfg, err := getTestActionsConfig(testNs)
	if err != nil {
		return nil, err
	}
	installer, err := NewInstaller(testNs, "", ChartOptions{
		Directory: "../../data/testchart",
		Version:   "0.1.0",
	})
	if err != nil {
		return nil, err
	}
	installer.actionsCfg = cfg
	installer.Getter.actionsCfg = cfg
	return installer, nil
}

func TestHelm(t *testing.T) {
	t.Parallel()

	instlr, err := getTestHelmInstaller()
	require.NoError(t, err)

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

func TestGetValueOf(t *testing.T) {
	t.Parallel()

	instlr, err := getTestHelmInstaller()
	require.NoError(t, err)

	ctx := context.Background()
	err = instlr.Install(ctx, InstallArgs{
		ReleaseName: "test-release",
		Values: map[string]interface{}{
			"image": map[string]interface{}{
				"tag": "override",
			},
		},
	})
	require.NoError(t, err)

	rel, err := instlr.Get("test-release")
	assert.NotNil(t, rel)
	assert.NoError(t, err)

	testCases := []struct {
		key   string
		value any
	}{
		{key: "image.repository", value: "nginx"},
		{key: "image.pullPolicy", value: "IfNotPresent"},
		{key: "service.port", value: float64(80)},
		{key: "ingress.enabled", value: true},
		{key: "ingress.enabled", value: true},
		{key: "does.not.exist", value: nil},
		{key: "image.tag", value: "override"},
	}

	for _, tc := range testCases {
		val, _, err := GetValueOf[any](rel, tc.key)
		require.NoError(t, err)
		assert.Equal(t, val, tc.value)
	}

	val, ok, err := GetValueOf[string](rel, "image.repository")
	assert.True(t, ok)
	assert.NoError(t, err)
	assert.Equal(t, "nginx", val)
}
