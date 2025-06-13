import { useQuery, useQueries } from '@tanstack/react-query';
import { getClustersFn, Cluster } from 'api/clusters';
import { getNamespacesForCluster } from 'api/namespaces';

export const CLUSTERS_QUERY_KEY = 'clusters';

export const useClusters = () => {
  return useQuery<Cluster[]>({
    queryKey: [CLUSTERS_QUERY_KEY],
    queryFn: getClustersFn,
  });
};

export const useClustersWithNamespaces = (clusters: Cluster[]) => {
  // Fetch namespaces for all clusters in parallel
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
