package k8s

import (
	"go.uber.org/zap"

	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/kubernetes"
)

// k8sHandler is usually the last handler in the chain, so it does not have a next handler.
type k8sHandler struct {
	kubeClient        *kubernetes.Kubernetes
	log               *zap.SugaredLogger
	versionServiceURL string
}

// New returns a new RBAC handler.
func New(log *zap.SugaredLogger, kubeClient *kubernetes.Kubernetes, vsURL string) handlers.Handler {
	l := log.With("handler", "k8s")
	return &k8sHandler{
		kubeClient:        kubeClient,
		log:               l,
		versionServiceURL: vsURL,
	}
}

// SetNext sets the next handler to call in the chain.
func (h *k8sHandler) SetNext(next handlers.Handler) {}
