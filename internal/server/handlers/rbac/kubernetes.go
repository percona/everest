// Package rbac provides the RBAC handler.
package rbac

import (
	"context"
	"errors"
	"fmt"

	"github.com/AlekSi/pointer"

	"github.com/percona/everest/api"
)

func (h *rbacHandler) GetKubernetesClusterResources(ctx context.Context) (*api.KubernetesClusterResources, error) {
	return h.next.GetKubernetesClusterResources(ctx)
}

func (h *rbacHandler) GetKubernetesClusterInfo(ctx context.Context) (*api.KubernetesClusterInfo, error) {
	return h.next.GetKubernetesClusterInfo(ctx)
}

func (h *rbacHandler) GetUserPermissions(ctx context.Context) (*api.UserPermissions, error) {
	user, err := h.userGetter(ctx)
	if err != nil {
		return nil, err
	}
	perms, err := h.enforcer.GetImplicitPermissionsForUser(user)
	if err != nil {
		return nil, fmt.Errorf("failed to GetImplicitPermissionsForUser: %w", err)
	}

	if err := h.resolveRoles(user, perms); err != nil {
		return nil, err
	}
	result := pointer.To(perms)

	nextRes, err := h.next.GetUserPermissions(ctx)
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
