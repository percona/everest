package namespaces

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path"

	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/helm/utils"
	"github.com/percona/everest/pkg/cli/steps"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/utils/must"
	"github.com/percona/everest/pkg/version"
	"go.uber.org/zap"
	"helm.sh/helm/v3/pkg/cli/values"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

const (
	dbNamespaceSubChartPath = "/charts/everest-db-namespace"
)

func NewNamespaceAdd(c NamespaceAddConfig, l *zap.SugaredLogger) (*NamespaceAdder, error) {
	n := &NamespaceAdder{
		cfg: c,
		l:   l.With("component", "namespace-adder"),
	}
	if c.Pretty {
		n.l = zap.NewNop().Sugar()
	}

	k, err := kubernetes.New(c.KubeconfigPath, n.l)
	if err != nil {
		var u *url.Error
		if errors.As(err, &u) {
			l.Error("Could not connect to Kubernetes. " +
				"Make sure Kubernetes is running and is accessible from this computer/server.")
		}
		return nil, err
	}
	n.kubeClient = k
	return n, nil
}

type NamespaceAddConfig struct {
	Namespace        string
	PG               bool
	PXC              bool
	PSMDB            bool
	SkipWizard       bool
	KubeconfigPath   string
	DisableTelemetry bool
	Pretty           bool
	TakeOwnership    bool
	Update           bool
	helm.CLIOptions
}

type NamespaceAdder struct {
	l             *zap.SugaredLogger
	cfg           NamespaceAddConfig
	kubeClient    *kubernetes.Kubernetes
	helmInstaller *helm.Installer
}

// Run namespace add.
func (n *NamespaceAdder) Run(ctx context.Context) error {
	everestVersion, err := version.EverestVersionFromDeployment(ctx, n.kubeClient)
	if err != nil {
		return errors.Join(err, errors.New("failed to get Everest version"))
	}

	namespace := n.cfg.Namespace
	installSteps := []steps.Step{
		n.newStepInstallNamespace(everestVersion.String(), namespace),
	}

	var out io.Writer = os.Stdout
	if !n.cfg.Pretty {
		out = io.Discard
	}

	if err := steps.RunStepsWithSpinner(ctx, installSteps, out); err != nil {
		return err
	}
	return nil
}

func (n *NamespaceAdder) getValues() values.Options {
	v := []string{}
	v = append(v, "cleanupOnUninstall=false") // uninstall command will do the clean-up on its own.
	v = append(v, fmt.Sprintf("pxc=%t", n.cfg.PXC))
	v = append(v, fmt.Sprintf("postgresql=%t", n.cfg.PG))
	v = append(v, fmt.Sprintf("psmdb=%t", n.cfg.PSMDB))
	v = append(v, fmt.Sprintf("telemetry=%t", !n.cfg.DisableTelemetry))
	return values.Options{Values: v}
}

func (n *NamespaceAdder) newStepInstallNamespace(version, namespace string) steps.Step {
	return steps.Step{
		Desc: fmt.Sprintf("Installing namespace '%s'", namespace),
		F: func(ctx context.Context) error {
			return n.provisionDBNamespace(ctx, version, namespace)
		},
	}
}

func (n *NamespaceAdder) provisionDBNamespace(
	ctx context.Context,
	version string,
	namespace string,
) error {
	nsExists, err := n.namespaceExists(ctx, namespace)
	if err != nil {
		return err
	}

	if nsExists && !(n.cfg.Update && n.cfg.TakeOwnership) {
		return fmt.Errorf("namespace (%s) already exists", namespace)
	}

	chartDir := ""
	if n.cfg.ChartDir != "" {
		chartDir = path.Join(n.cfg.ChartDir, dbNamespaceSubChartPath)
	}
	values := must.Must(utils.MergeVals(n.getValues(), nil))
	installer := helm.Installer{
		ReleaseName:            namespace,
		ReleaseNamespace:       namespace,
		Values:                 values,
		CreateReleaseNamespace: nsExists,
	}
	if err := installer.Init(n.cfg.KubeconfigPath, helm.ChartOptions{
		Directory: chartDir,
		URL:       n.cfg.RepoURL,
		Name:      helm.EverestDBNamespaceChartName,
		Version:   version,
	}); err != nil {
		return fmt.Errorf("could not initialize Helm installer: %w", err)
	}
	n.l.Infof("Installing DB namespace Helm chart in namespace ", namespace)
	return installer.Install(ctx)
}

func (n *NamespaceAdder) namespaceExists(ctx context.Context, namespace string) (bool, error) {
	_, err := n.kubeClient.GetNamespace(ctx, namespace)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("cannot check if namesapce exists: %w", err)
	}
	return true, nil
}
