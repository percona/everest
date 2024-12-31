// Package rbac provides the RBAC handler.
package rbac

import (
	"context"
	"errors"
	"fmt"

	"github.com/casbin/casbin/v2"
	"go.uber.org/zap"

	"github.com/percona/everest/internal/server/handlers"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/rbac"
)

// ErrInsufficientPermissions is returned when the user does not have sufficient permissions to perform the operation.
var ErrInsufficientPermissions = errors.New("insufficient permissions for performing the operation")

type rbacHandler struct {
	enforcer casbin.IEnforcer
	log      *zap.SugaredLogger
	next     handlers.Handler
}

// New returns a new RBAC handler.
//
//nolint:ireturn
func New(
	ctx context.Context,
	log *zap.SugaredLogger,
	kubeClient *kubernetes.Kubernetes,
) (handlers.Handler, error) {
	enf, err := rbac.NewEnforcerWithRefresh(ctx, kubeClient, log)
	if err != nil {
		return nil, fmt.Errorf("failed to create enforcer: %w", err)
	}
	l := log.With("handler", "rbac")
	return &rbacHandler{
		enforcer: enf,
		log:      l,
	}, nil
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
	ok, err := h.enforcer.Enforce(subject, resource, action, object)
	if err != nil {
		return fmt.Errorf("enforce error: %w", err)
	}
	if !ok {
		h.log.Warnf("Permission denied: [%s %s %s %s]", subject, resource, action, object)
		return ErrInsufficientPermissions
	}
	return nil
}
