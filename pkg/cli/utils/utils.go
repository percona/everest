// Package utils provides utility functions for the Everest CLI.
package utils

import (
	"context"
	"errors"
	"net/url"
	"path"

	"go.uber.org/zap"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/version"
)

const (
	dbNamespaceSubChartPath = "/charts/everest-db-namespace"
)

func DBNamespaceSubChartPath(dir string) string {
	if dir == "" {
		return ""
	}
	return path.Join(dir, dbNamespaceSubChartPath)
}

// CheckHelmInstallation ensures that the current installation was done using Helm chart.
// Returns the version of Everest installed in the cluster.
// Returns an error if the installation was not done using Helm chart.
func CheckHelmInstallation(ctx context.Context, client kubernetes.KubernetesConnector) (string, error) {
	everestVersion, err := version.EverestVersionFromDeployment(ctx, client)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return "", errors.New("everest is not installed in the cluster")
		}
		return "", errors.Join(err, errors.New("failed to get Everest version"))
	}

	// Versions below 1.4.0 are not installed using Helm.
	ver := everestVersion.String()
	if common.CheckConstraint(ver, "< 1.4.0") &&
		!version.IsDev(ver) { // allowed in development
		return "", errors.New("operation not supported for this version of Everest")
	}
	return ver, nil
}

// NewKubeclient creates a new Kubernetes client.
func NewKubeclient(l *zap.SugaredLogger, kubeconfigPath string) (*kubernetes.Kubernetes, error) {
	k, err := kubernetes.New(kubeconfigPath, l)
	if err != nil {
		var u *url.Error
		if errors.As(err, &u) {
			l.Error("Could not connect to Kubernetes. " +
				"Make sure Kubernetes is running and is accessible from this computer/server.")
		}
		return nil, err
	}
	return k, nil
}
