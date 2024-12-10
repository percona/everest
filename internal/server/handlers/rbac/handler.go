package rbac

import (
	"context"
	"errors"
	"fmt"

	"github.com/AlekSi/pointer"
	"github.com/casbin/casbin/v2"
	"go.uber.org/zap"

	"github.com/percona/everest/api"
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
func New(
	ctx context.Context,
	log *zap.SugaredLogger,
	kubeClient *kubernetes.Kubernetes,
) (handlers.Handler, error) {
	enf, err := rbac.NewEnforcer(ctx, kubeClient, log)
	if err != nil {
		return nil, fmt.Errorf("failed to create enforcer: %w", err)
	}
	l := log.With("handler", "rbac")
	// todo
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

func (h *rbacHandler) GetKubernetesClusterResources(ctx context.Context) (*api.KubernetesClusterResources, error) {
	return h.next.GetKubernetesClusterResources(ctx)
}

func (h *rbacHandler) GetKubernetesClusterInfo(ctx context.Context) (*api.KubernetesClusterInfo, error) {
	return h.next.GetKubernetesClusterInfo(ctx)
}

func (h *rbacHandler) GetUserPermissions(ctx context.Context, user string) (*api.UserPermissions, error) {
	perms, err := h.enforcer.GetImplicitPermissionsForUser(user)
	if err != nil {
		return nil, fmt.Errorf("failed to GetImplicitPermissionsForUser: %w", err)
	}

	if err := h.resolveRoles(user, perms); err != nil {
		return nil, err
	}
	result := pointer.To(perms)

	nextRes, err := h.next.GetUserPermissions(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to GetUserPermissions: %w", err)
	}

	enabled := nextRes.Enabled
	if !enabled {
		result = nil
	}

	res := &api.UserPermissions{
		Permissions: result,
		Enabled:     enabled,
	}
	return res, nil
}

// For a given set of `permissions` for a `user`, this function
// will resolve all roles for the user.
func (h *rbacHandler) resolveRoles(user string, permissions [][]string) error {
	userRoles, err := h.enforcer.GetRolesForUser(user)
	if err != nil {
		return errors.Join(err, errors.New("cannot get user roles"))
	}
	for _, role := range userRoles {
		for i, perm := range permissions {
			if perm[0] == role {
				permissions[i][0] = user
			}
		}
	}
	return nil
}
