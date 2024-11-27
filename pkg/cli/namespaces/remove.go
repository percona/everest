package namespaces

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"

	"go.uber.org/zap"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/steps"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/version"
)

// NamespaceRemoveConfig is the configuration for the namespace removal operation.
type NamespaceRemoveConfig struct {
	// KubeconfigPath is a path to a kubeconfig
	KubeconfigPath string `mapstructure:"kubeconfig"`
	// Force delete a namespace by deleting databases in it.
	Force bool `mapstructure:"force"`
	// If set, we will keep the namespace
	KeepNamespace bool `mapstructure:"keep-namespace"`
	// If set, we will print the pretty output.
	Pretty bool

	// Namespaces (DB Namespaces) to remove
	Namespaces []string
}

// NamespaceRemover is the CLI operation to remove namespaces.
type NamespaceRemover struct {
	config     NamespaceRemoveConfig
	kubeClient *kubernetes.Kubernetes
	l          *zap.SugaredLogger
}

// NewNamespaceRemove returns a new CLI operation to remove namespaces.
func NewNamespaceRemove(c NamespaceRemoveConfig, l *zap.SugaredLogger) (*NamespaceRemover, error) {
	n := &NamespaceRemover{
		config: c,
		l:      l.With("component", "namespace-remover"),
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

// Run the namespace removal operation.
func (r *NamespaceRemover) Run(ctx context.Context) error {
	everestVersion, err := version.EverestVersionFromDeployment(ctx, r.kubeClient)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return errors.New("everest is not installed in the cluster")
		}
		return errors.Join(err, errors.New("failed to get Everest version"))
	}
	ver := everestVersion.String()

	// This command assumes Helm based installation, which was introduced in 1.4.0
	if common.CheckConstraint(everestVersion.String(), "< 1.4.0") &&
		!version.IsDev(ver) { // allowed in development
		return errors.New("operation not supported for this version of Everest")
	}

	dbsExist, err := r.kubeClient.DatabasesExist(ctx, r.config.Namespaces...)
	if err != nil {
		return errors.Join(err, errors.New("failed to check if databases exist"))
	}

	if dbsExist && !r.config.Force {
		return errors.New("databases exist in the namespaces. Please remove them first or use --force")
	}

	removalSteps := []steps.Step{}
	for _, ns := range r.config.Namespaces {
		removalSteps = append(removalSteps, NewRemoveNamespaceSteps(ns, r.config.KeepNamespace, r.kubeClient)...)
	}

	var out io.Writer = os.Stdout
	if !r.config.Pretty {
		out = io.Discard
	}

	return steps.RunStepsWithSpinner(ctx, removalSteps, out)
}

// NewRemoveNamespaceSteps returns the steps to remove a namespace.
func NewRemoveNamespaceSteps(namespace string, keepNs bool, k *kubernetes.Kubernetes) []steps.Step {
	return []steps.Step{
		{
			Desc: fmt.Sprintf("Deleting database clusters in namespace '%s'", namespace),
			F: func(ctx context.Context) error {
				return k.DeleteDatabaseClusters(ctx, namespace)
			},
		},
		{
			Desc: fmt.Sprintf("Deleting backup storages in namespace '%s'", namespace),
			F: func(ctx context.Context) error {
				return k.DeleteBackupStorages(ctx, namespace)
			},
		},
		{
			Desc: fmt.Sprintf("Deleting monitoring instances in namespace '%s'", namespace),
			F: func(ctx context.Context) error {
				return k.DeleteMonitoringConfigs(ctx, namespace)
			},
		},
		{
			Desc: fmt.Sprintf("Deleting namespace '%s'", namespace),
			F: func(ctx context.Context) error {
				u, err := helm.NewUninstaller(namespace, namespace, k.Kubeconfig())
				if err != nil {
					return errors.Join(err, errors.New("failed to create helm uninstaller"))
				}
				if _, err := u.Uninstall(false); err != nil {
					return errors.Join(err, errors.New("failed to uninstall helm chart"))
				}
				if !keepNs {
					return k.DeleteNamespace(ctx, namespace)
				}
				return nil
			},
		},
	}
}
