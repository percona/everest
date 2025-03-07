package k8s

import (
    "context"
    "fmt"
)

func (h *k8sHandler) ListNamespaces(ctx context.Context) ([]string, error) {
    nsList, err := h.kubeConnector.GetDBNamespaces(ctx)
    if err != nil {
        return nil, fmt.Errorf("failed to GetDBNamespaces: %w", err)
    }

    result := make([]string, 0, len(nsList.Items))
    for _, ns := range nsList.Items {
        result = append(result, ns.GetName())
    }
    return result, nil
}
