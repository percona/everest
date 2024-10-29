package kubernetes

import "context"

// DeleteCatalogSource deletes a catalog source.
func (k *Kubernetes) DeleteCatalogSource(ctx context.Context, namespace, name string) error {
	return k.client.DeleteCatalogSource(ctx, namespace, name)
}
