package rbac

import (
	"context"
	"errors"

	"go.uber.org/zap"

	"github.com/percona/everest/api"
	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/kubernetes"
)

var errInvalidRequest = errors.New("invalid request")

type validateHandler struct {
	log        *zap.SugaredLogger
	next       handlers.Handler
	kubeClient *kubernetes.Kubernetes
}

// New returns a new RBAC handler.
func New(
	ctx context.Context,
	log *zap.SugaredLogger,
	kubeClient *kubernetes.Kubernetes,
) handlers.Handler {
	l := log.With("validator", "rbac")
	return &validateHandler{
		log:        l,
		kubeClient: kubeClient,
	}
}

// SetNext sets the next handler to call in the chain.
func (h *validateHandler) SetNext(next handlers.Handler) {
	h.next = next
}

func (h *validateHandler) GetKubernetesClusterResources(ctx context.Context) (*api.KubernetesClusterResources, error) {
	return h.next.GetKubernetesClusterResources(ctx)
}

func (h *validateHandler) GetKubernetesClusterInfo(ctx context.Context) (*api.KubernetesClusterInfo, error) {
	return h.next.GetKubernetesClusterInfo(ctx)
}

func (h *validateHandler) GetUserPermissions(ctx context.Context, user string) (*api.UserPermissions, error) {
	return h.next.GetUserPermissions(ctx, user)
}
