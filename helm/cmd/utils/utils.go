// Package utils provides utility functions for the everest-helm-tools command.
package utils

import (
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/kubernetes"
)

// NewClient creates a new Kubernetes client.
func NewClient(l *zap.SugaredLogger, kubeconfigPath string) (*kubernetes.Kubernetes, error) {
	if kubeconfigPath != "" {
		return kubernetes.New(kubeconfigPath, l)
	}
	return kubernetes.NewInCluster(l)
}
