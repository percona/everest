import { useQueries } from '@tanstack/react-query';
import { getNamespacesForCluster } from 'api/namespaces';
import { Cluster } from 'api/clusters';

export const useClustersWithNamespaces = (clusters: Cluster[]) => {
  const queries = useQueries({
    queries: clusters.map((cluster) => ({
      queryKey: ['namespaces', cluster.name],
      queryFn: () => getNamespacesForCluster(cluster.name),
      select: (namespaces: string[]) => namespaces,
    })),
  });

  // Only include clusters with at least one namespace
  return clusters.filter((_, idx) => {
    const namespaces = queries[idx]?.data;
    return Array.isArray(namespaces) && namespaces.length > 0;
  });
};
