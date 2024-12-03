// Package utils provides utility functions for the Everest CLI.
package utils

import (
	"context"
	"errors"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/version"
)

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
