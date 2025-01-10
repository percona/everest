package k8s

import (
	"context"
	"fmt"
)

func (h *k8sHandler) ListNamespaces(ctx context.Context) ([]string, error) {
	result, err := h.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to GetDBNamespaces: %w", err)
	}
	return result, nil
}
