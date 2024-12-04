package rbac

import (
	"context"
	"errors"
	"fmt"

	"github.com/casbin/casbin/v2"
	"github.com/percona/everest/api"
	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/kubernetes"
	"go.uber.org/zap"
)

// ErrInsufficientPermissions is returned when the user does not have sufficient permissions to perform the operation.
var ErrInsufficientPermissions = errors.New("insufficient permissions for performing the operation")

type rbacHandler struct {
	enforcer   casbin.IEnforcer
	log        *zap.SugaredLogger
	kubeClient *kubernetes.Kubernetes
	next       handlers.Handler
}

// New returns a new RBAC handler.
func New(
	ctx context.Context,
	log *zap.SugaredLogger,
	kubeClient kubernetes.KubernetesConnector,
) (handlers.Handler, error) {
	// todo
	return &rbacHandler{}, nil
}

// SetNext sets the next handler to call in the chain.
func (h *rbacHandler) SetNext(next handlers.Handler) {
	h.next = next
}

func (h *rbacHandler) enforce(
	subject,
	resource,
	action,
	object string,
) error {
	ok, err := h.enforcer.Enforce("alice", "data1", "read")
	if err != nil {
		return fmt.Errorf("enforce error: %w", err)
	}
	if !ok {
		h.log.Warnf("Permission denied: [%s %s %s %s]", subject, resource, action, object)
		return ErrInsufficientPermissions
	}
	return nil
}

func (h *rbacHandler) GetKubernetesClusterInfo(ctx context.Context, user string) (*api.KubernetesClusterInfo, error) {
	return nil, nil
}

func (h *rbacHandler) GetUserPermissions(ctx context.Context, user string) (*api.UserPermissions, error) {
	return nil, nil
}
