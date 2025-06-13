import { api } from './api';
import { GetNamespacesPayload } from 'shared-types/namespaces.types';
import { getClustersFn } from './clusters';

export const getNamespacesFn = async () => {
  const response = await api.get<GetNamespacesPayload>('namespaces');
  return response.data;
};

// Fetch namespaces for a specific cluster
export const getNamespacesForCluster = async (cluster: string) => {
  const response = await api.get<GetNamespacesPayload>(`clusters/${cluster}/namespaces`);
  return response.data;
};

// Fetch namespaces for all clusters
export const getAllNamespacesFn = async () => {
  const clusters = await getClustersFn();
  const namespacesArrays = await Promise.all(
    clusters.map((cluster) => getNamespacesForCluster(cluster.name))
  );
  // Flatten the array of arrays and deduplicate
  return Array.from(new Set(namespacesArrays.flat()));
};
