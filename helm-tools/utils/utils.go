package helmutils

import (
	"github.com/percona/everest/pkg/kubernetes"
	"go.uber.org/zap"
)

// NewClient returns a new Kubernetes client.
// If kubeconfigPath is empty, it will use the in-cluster configuration.
func NewClient(l *zap.SugaredLogger, kubeconfigPath string) (kubernetes.KubernetesConnector, error) {
	if kubeconfigPath != "" {
		return kubernetes.New(kubeconfigPath, l)
	}
	return kubernetes.NewInCluster(l)
}
