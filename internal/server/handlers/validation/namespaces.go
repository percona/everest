package validation

import "context"

func (h *validateHandler) ListNamespaces(ctx context.Context, cluster string) ([]string, error) {
	return h.next.ListNamespaces(ctx, cluster)
}
