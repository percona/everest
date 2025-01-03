package validation

import "context"

func (h *validateHandler) ListNamespaces(ctx context.Context) ([]string, error) {
	return h.next.ListNamespaces(ctx)
}
