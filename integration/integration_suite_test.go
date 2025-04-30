package integration

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"testing"

	"github.com/AlekSi/pointer"
	"github.com/go-logr/zapr"
	"github.com/phayes/freeport"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"helm.sh/helm/v3/pkg/cli/values"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	ctrlruntimelog "sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/percona/everest/client"
	"github.com/percona/everest/cmd/config"
	"github.com/percona/everest/internal/server"
	"github.com/percona/everest/pkg/cli/helm"
	helmutils "github.com/percona/everest/pkg/cli/helm/utils"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

const (
	systemNamespace      = common.SystemNamespace
	jwtPrivateKeyPath    = "./testdata/everest_test_id_rsa"
	envtestBinDirEnvVar  = "ENVTEST_BIN_DIR"
	defaultAdminPassword = "admin"
)

type testHelper struct {
	k8sEnv        *envtest.Environment
	k8sClient     ctrlclient.Client
	server        *server.EverestServer
	serverPort    int
	everestClient *client.ClientWithResponses
	testNs        string
}

func (h *testHelper) beforeTest(t *testing.T) {
	h.testNs = "everest"
	err := h.setupKubernetesEnvironment(t.Context())
	require.NoError(t, err)

	k8sConn, err := kubernetes.NewWithRESTConfig(h.k8sEnv.Config, zap.NewNop().Sugar())
	require.NoError(t, err)

	err = createResources(t.Context(), k8sConn)
	require.NoError(t, err)

	err = h.setupEverestServer(t, k8sConn)
	require.NoError(t, err)

	err = h.setupEverestClient()
	require.NoError(t, err)

	// discard the logs from controller-runtime
	ctrlruntimelog.SetLogger(zapr.NewLogger(zap.NewNop()))
}

// setupKubernetesEnvironment initializes the Kubernetes test environment
func (h *testHelper) setupKubernetesEnvironment(ctx context.Context) error {
	h.k8sEnv = &envtest.Environment{
		BinaryAssetsDirectory: os.Getenv(envtestBinDirEnvVar),
	}

	restCfg, err := h.k8sEnv.Start()
	if err != nil {
		return fmt.Errorf("failed to start k8s environment: %w", err)
	}

	log := zap.NewNop().Sugar()
	k8sConn, err := kubernetes.NewWithRESTConfig(restCfg, log)
	if err != nil {
		return fmt.Errorf("failed to create kubernetes connector: %w", err)
	}

	h.k8sClient = k8sConn.K8sClient()

	// create test namespace
	if _, err := k8sConn.CreateNamespace(ctx, &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: h.testNs,
		},
	}); err != nil {
		return fmt.Errorf("failed to create namespace: %w", err)
	}
	return nil
}

// setupEverestServer initializes the Everest server with the given configuration
func (h *testHelper) setupEverestServer(t *testing.T, k8sConn kubernetes.KubernetesConnector) error {
	srvCfg, err := config.ParseConfig()
	if err != nil {
		return fmt.Errorf("failed to parse everest config: %w", err)
	}

	srvCfg.KubeConnector = k8sConn
	srvCfg.DisableTelemetry = true
	srvCfg.JWTPrivateKeyPath = jwtPrivateKeyPath
	srvCfg.Silent = true

	// find a random unused port for the server
	port, err := freeport.GetFreePort()
	if err != nil {
		return fmt.Errorf("failed to get free port: %w", err)
	}
	srvCfg.HTTPPort = port
	h.serverPort = port

	ctx := t.Context()
	h.server, err = server.NewEverestServer(ctx, srvCfg, zap.NewNop().Sugar())
	if err != nil {
		return fmt.Errorf("failed to create everest server: %w", err)
	}

	go func() {
		err := h.server.Start()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			assert.FailNow(t, "failed to start everest server: %s", err)
		}
	}()

	return nil
}

func (h *testHelper) teardown(t *testing.T) {
	err := h.k8sEnv.Stop()
	require.NoError(t, err)

	err = h.server.Shutdown(context.Background())
	require.NoError(t, err)
}

// setupHelmChart prepares the Helm chart for installation
func setupHelmChart() (string, func(), map[string]interface{}, error) {
	chartDir := ""
	cleanup, err := helmutils.SetupEverestDevChart(zap.NewNop().Sugar(), &chartDir)
	if err != nil {
		return "", nil, nil, fmt.Errorf("failed to setup everest dev chart: %w", err)
	}

	vals, err := helmutils.MergeVals(values.Options{}, map[string]string{
		"server.initialAdminPassword": defaultAdminPassword,
	})
	if err != nil {
		cleanup()
		return "", nil, nil, fmt.Errorf("failed to merge values: %w", err)
	}

	return chartDir, cleanup, vals, nil
}

// createKubernetesResources creates all necessary Kubernetes resources
func createKubernetesResources(ctx context.Context, k8sConn kubernetes.KubernetesConnector, manifests helm.RenderedTemplate) error {
	// Apply CRDs
	crds, err := manifests.GetCRDs()
	if err != nil {
		return fmt.Errorf("failed to get CRDs: %w", err)
	}
	if err := k8sConn.ApplyManifestFile(ctx, helmutils.YAMLStringsToBytes(crds), systemNamespace); err != nil {
		return fmt.Errorf("failed to apply CRDs: %w", err)
	}

	// Create everest-system namespace
	if _, err := k8sConn.CreateNamespace(ctx, &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: systemNamespace,
		},
	}); err != nil {
		return fmt.Errorf("failed to create namespace: %w", err)
	}

	// Apply RBAC ConfigMap
	rbacConfigMap, err := manifests.GetRBACConfigMap()
	if err != nil {
		return fmt.Errorf("failed to get RBAC configmap: %w", err)
	}
	if err := k8sConn.ApplyManifestFile(ctx, helmutils.YAMLStringsToBytes(rbacConfigMap), systemNamespace); err != nil {
		return fmt.Errorf("failed to apply RBAC configmap: %w", err)
	}

	// Apply Accounts Secret
	accountsSecret, err := manifests.GetAccountsSecret()
	if err != nil {
		return fmt.Errorf("failed to get accounts secret: %w", err)
	}
	if err := k8sConn.ApplyManifestFile(ctx, helmutils.YAMLStringsToBytes(accountsSecret), systemNamespace); err != nil {
		return fmt.Errorf("failed to apply accounts secret: %w", err)
	}

	return nil
}

func createResources(ctx context.Context, k8sConn kubernetes.KubernetesConnector) error {
	chartDir, cleanup, vals, err := setupHelmChart()
	if err != nil {
		return err
	}
	defer cleanup()

	helmInstaller := &helm.Installer{
		ReleaseName:      systemNamespace,
		ReleaseNamespace: systemNamespace,
		Values:           vals,
	}

	if err := helmInstaller.Init("", helm.ChartOptions{
		Directory: chartDir,
		Version:   "0.0.0",
		Name:      helm.EverestChartName,
	}); err != nil {
		return fmt.Errorf("failed to init helm installer: %w", err)
	}

	manifests, err := helmInstaller.RenderTemplates(ctx)
	if err != nil {
		return fmt.Errorf("failed to render templates: %w", err)
	}

	return createKubernetesResources(ctx, k8sConn, manifests)
}

func (h *testHelper) setupEverestClient() error {
	apiURL := fmt.Sprintf("http://localhost:%d/v1", h.serverPort)
	tempClient, err := client.NewClientWithResponses(apiURL)
	if err != nil {
		return fmt.Errorf("failed to create everest client: %w", err)
	}

	resp, err := tempClient.CreateSessionWithResponse(context.Background(), client.CreateSessionJSONRequestBody{
		Username: pointer.To("admin"),
		Password: pointer.To(defaultAdminPassword),
	})
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	if resp.StatusCode() != http.StatusOK {
		return fmt.Errorf("failed to create session: %w", err)

	}

	apiToken := pointer.Get(resp.JSON200.Token)

	attachAPITokenReqModifier := func(_ context.Context, req *http.Request) error {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiToken))
		return nil
	}

	h.everestClient, err = client.NewClientWithResponses(apiURL,
		client.WithRequestEditorFn(attachAPITokenReqModifier))
	if err != nil {
		return fmt.Errorf("failed to create everest client: %w", err)
	}
	return nil
}

func newTestSuffix() string {
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}
