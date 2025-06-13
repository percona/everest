package k8s

import (
	"context"
	"fmt"

	"sigs.k8s.io/controller-runtime/pkg/cache"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/pkg/kubernetes"
)

func getKubernetesClientOptions(cache cache.Cache) ctrlclient.Options {
	var cacheOptions *ctrlclient.CacheOptions
	if cache != nil {
		cacheOptions = &ctrlclient.CacheOptions{
			Reader: cache,
		}
	}

	return ctrlclient.Options{
		Scheme: kubernetes.CreateScheme(),
		Cache:  cacheOptions,
	}
}

func (h *k8sHandler) ListNamespaces(ctx context.Context, cluster string) ([]string, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubernetes connector: %w", err)
	}

	nsList, err := connector.GetDBNamespaces(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to GetDBNamespaces: %w", err)
	}

	result := make([]string, 0, len(nsList.Items))
	for _, ns := range nsList.Items {
		result = append(result, ns.GetName())
	}
	return result, nil
}
