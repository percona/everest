// Package validation provides the validation handler.
package validation

import (
	"context"

	"github.com/percona/everest/api"
)

func (h *validateHandler) GetKubernetesClusterResources(ctx context.Context, cluster string) (*api.KubernetesClusterResources, error) {
	return h.next.GetKubernetesClusterResources(ctx, cluster)
}

func (h *validateHandler) GetKubernetesClusterInfo(ctx context.Context, cluster string) (*api.KubernetesClusterInfo, error) {
	return h.next.GetKubernetesClusterInfo(ctx, cluster)
}

func (h *validateHandler) GetUserPermissions(ctx context.Context) (*api.UserPermissions, error) {
	return h.next.GetUserPermissions(ctx)
}

func (h *validateHandler) GetSettings(ctx context.Context) (*api.Settings, error) {
	return h.next.GetSettings(ctx)
}
