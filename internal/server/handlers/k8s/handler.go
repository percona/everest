package k8s

import (
	"context"
	"fmt"

	"go.uber.org/zap"
	"k8s.io/client-go/rest"

	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/kubernetes"
)

// k8sHandler is usually the last handler in the chain, so it does not have a next handler.
type k8sHandler struct {
	kubeConnector     kubernetes.KubernetesConnector
	log               *zap.SugaredLogger
	versionServiceURL string
}

// New returns a new RBAC handler.
//
//nolint:ireturn
func New(log *zap.SugaredLogger, kubeConnector kubernetes.KubernetesConnector, vsURL string) handlers.Handler {
	l := log.With("handler", "k8s")
	return &k8sHandler{
		kubeConnector:     kubeConnector,
		log:               l,
		versionServiceURL: vsURL,
	}
}

// SetNext sets the next handler to call in the chain.
func (h *k8sHandler) SetNext(_ handlers.Handler) {}

func (h *k8sHandler) Connector(ctx context.Context, cluster string) (kubernetes.KubernetesConnector, error) {
	connector := h.kubeConnector
	if cluster != "in-cluster" {
		// Get the cluster secret
		clusterList, err := h.kubeConnector.Clusters().List(ctx)
		if err != nil {
			return nil, err
		}
		for _, c := range clusterList.Items {
			if c.Name == cluster {
				tlsClientConfig := rest.TLSClientConfig{
					Insecure:   c.Config.Insecure,
					ServerName: c.Config.ServerName,
					CertData:   c.Config.CertData,
					KeyData:    c.Config.KeyData,
					CAData:     c.Config.CAData,
				}
				config := &rest.Config{
					Host:            c.Server,
					Username:        c.Config.Username,
					Password:        c.Config.Password,
					BearerToken:     c.Config.BearerToken,
					TLSClientConfig: tlsClientConfig,
				}
				connector, err = kubernetes.NewFromRestConfig(config, nil)
				if err != nil {
					return nil, fmt.Errorf("failed to create kubernetes connector: %w", err)
				}
				break
			}
		}
	}
	return connector, nil
}
