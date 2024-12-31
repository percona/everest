// Package validation provides the validation handler.
package validation

import (
	"context"

	"github.com/percona/everest/api"
)

func (h *validateHandler) GetKubernetesClusterResources(ctx context.Context) (*api.KubernetesClusterResources, error) {
	return h.next.GetKubernetesClusterResources(ctx)
}

func (h *validateHandler) GetKubernetesClusterInfo(ctx context.Context) (*api.KubernetesClusterInfo, error) {
	return h.next.GetKubernetesClusterInfo(ctx)
}

func (h *validateHandler) GetUserPermissions(ctx context.Context, user string) (*api.UserPermissions, error) {
	return h.next.GetUserPermissions(ctx, user)
}
