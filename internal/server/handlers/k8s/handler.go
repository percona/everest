package rbac

import (
	"context"
	"errors"

	"go.uber.org/zap"

	"github.com/percona/everest/api"
	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/kubernetes"
)

// ErrInsufficientPermissions is returned when the user does not have sufficient permissions to perform the operation.
var ErrInsufficientPermissions = errors.New("insufficient permissions for performing the operation")

// k8sHandler is usually the last handler in the chain, so it does not have a next handler.
type k8sHandler struct {
	kubeClient *kubernetes.Kubernetes
	log        *zap.SugaredLogger
}

// New returns a new RBAC handler.
func New(log *zap.SugaredLogger, kubeClient *kubernetes.Kubernetes) handlers.Handler {
	l := log.With("handler", "k8s")
	return &k8sHandler{
		kubeClient: kubeClient,
		log:        l,
	}
}

// SetNext sets the next handler to call in the chain.
func (h *k8sHandler) SetNext(next handlers.Handler) {}

func (h *k8sHandler) GetKubernetesClusterInfo(ctx context.Context, user string) (*api.KubernetesClusterInfo, error) {
	return nil, nil
}

func (h *k8sHandler) GetUserPermissions(ctx context.Context, user string) (*api.UserPermissions, error) {
	return nil, nil
}
