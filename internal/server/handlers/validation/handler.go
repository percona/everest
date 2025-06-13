// Package validation provides the validation handler.
package validation

import (
	"context"
	"fmt"

	"go.uber.org/zap"
	"k8s.io/client-go/rest"

	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/kubernetes"
)

type validateHandler struct {
	log           *zap.SugaredLogger
	next          handlers.Handler
	kubeConnector kubernetes.KubernetesConnector
}

// New returns a new RBAC handler.
//
//nolint:ireturn
func New(
	log *zap.SugaredLogger,
	kubeConnector kubernetes.KubernetesConnector,
) handlers.Handler {
	l := log.With("handler", "validator")
	return &validateHandler{
		log:           l,
		kubeConnector: kubeConnector,
	}
}

// SetNext sets the next handler to call in the chain.
func (h *validateHandler) SetNext(next handlers.Handler) {
	h.next = next
}

func (h *validateHandler) Connector(ctx context.Context, cluster string) (kubernetes.KubernetesConnector, error) {
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
