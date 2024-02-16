import { useQuery } from 'react-query';
import {
  GetKubernetesClusterInfoPayload,
  KubernetesClusterInfo,
} from 'shared-types/kubernetes.types';
import { getKubernetesClusterInfoFn } from 'api/kubernetesClusterApi';

export const useKubernetesClusterInfo = (queryKey: string) => {
  return useQuery<
    GetKubernetesClusterInfoPayload,
    unknown,
    KubernetesClusterInfo
  >(queryKey, () => getKubernetesClusterInfoFn());
};
