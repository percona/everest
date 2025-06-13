import { QueryKey, useQuery } from '@tanstack/react-query';
import {
  GetKubernetesClusterInfoPayload,
  KubernetesClusterInfo,
} from 'shared-types/kubernetes.types';
import { getKubernetesClusterInfoFn } from 'api/kubernetesClusterApi';

export const useKubernetesClusterInfo = (queryKey: QueryKey, cluster: string = 'in-cluster') =>
  useQuery<GetKubernetesClusterInfoPayload, unknown, KubernetesClusterInfo>({
    queryKey: [...queryKey, cluster],
    queryFn: () => getKubernetesClusterInfoFn(cluster),
  });
