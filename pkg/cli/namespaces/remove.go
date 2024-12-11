package namespaces

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	"go.uber.org/zap"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/steps"
	cliutils "github.com/percona/everest/pkg/cli/utils"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

const (
	pollInterval = 5 * time.Second
	pollTimeout  = 5 * time.Minute
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

	k, err := cliutils.NewKubeclient(n.l, n.config.KubeconfigPath)
	if err != nil {
		return nil, err
	}
	n.kubeClient = k
	return n, nil
}

// ErrNamespaceNotEmpty is returned when the namespace is not empty.
var ErrNamespaceNotEmpty = errors.New("cannot remove namespace with running database clusters")

// Run the namespace removal operation.
func (r *NamespaceRemover) Run(ctx context.Context) error {
	// This command expects a Helm based installation (< 1.4.0)
	_, err := cliutils.CheckHelmInstallation(ctx, r.kubeClient)
	if err != nil {
		return err
	}

	dbsExist, err := r.kubeClient.DatabasesExist(ctx, r.config.Namespaces...)
	if err != nil {
		return errors.Join(err, errors.New("failed to check if databases exist"))
	}

	if dbsExist && !r.config.Force {
		return ErrNamespaceNotEmpty
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
				if keepNs {
					// keep the namespace, but remove the Everest label
					return removeEverestLabelFromNamespace(ctx, k, namespace)
				}
				if err := k.DeleteNamespace(ctx, namespace); err != nil {
					return err
				}
				return ensureNamespaceGone(ctx, namespace, k)
			},
		},
	}
}

func removeEverestLabelFromNamespace(ctx context.Context, k *kubernetes.Kubernetes, namespace string) error {
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		ns, err := k.GetNamespace(ctx, namespace)
		if err != nil {
			return true, err
		}
		if !isManagedByEverest(ns) {
			return true, nil
		}
		labels := ns.GetLabels()
		delete(labels, common.KubernetesManagedByLabel)
		ns.SetLabels(labels)
		_, err = k.UpdateNamespace(ctx, ns, v1.UpdateOptions{})
		if err != nil && k8serrors.IsConflict(err) {
			return false, nil
		}
		return true, err
	})
}

func ensureNamespaceGone(ctx context.Context, namespace string, k *kubernetes.Kubernetes) error {
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
		_, err := k.GetNamespace(ctx, namespace)
		if err != nil && k8serrors.IsNotFound(err) {
			return true, nil
		} else if err != nil {
			return false, err
		}
		return false, nil
	})
}
