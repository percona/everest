package validation

import "context"

func (h *validateHandler) ListNamespaces(ctx context.Context, user string) ([]string, error) {
	return h.next.ListNamespaces(ctx, user)
}
