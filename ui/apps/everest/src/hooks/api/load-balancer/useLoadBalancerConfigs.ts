import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createLoadBalancerConfigFn,
  deleteParticularLoadBalancerConfigFn,
  getLoadBalancerConfigsFn,
  getParticularLoadBalancerConfigFn,
  updateLoadBalancerConfigFn,
} from 'api/loadBalancer';
import {
  LoadBalancerConfig,
  LoadBalancerConfigRequest,
} from 'shared-types/loadbalancer.types';

export const useLoadBalancerConfigs = () =>
  // TODO add types
  useQuery<LoadBalancerConfigRequest>({
    queryKey: ['load-balancer-configs'],
    queryFn: getLoadBalancerConfigsFn,
  });

export const useLoadBalancerConfig = (configName: string) =>
  useQuery<LoadBalancerConfig>({
    queryKey: ['load-balancer-config', configName],
    queryFn: () => getParticularLoadBalancerConfigFn(configName),
    enabled: !!configName,
  });

export const useCreateLoadBalancerConfig = () => {
  return useMutation<LoadBalancerConfig, unknown, LoadBalancerConfigRequest>({
    mutationFn: (payload: object) => createLoadBalancerConfigFn(payload),
  });
};

export const useDeleteLoadBalancerConfig = (configName: string) => {
  return useMutation<unknown, unknown, void>({
    mutationFn: () => deleteParticularLoadBalancerConfigFn(configName),
  });
};

export const useUpdateLoadBalancerConfig = (configName: string) => {
  return useMutation<LoadBalancerConfig, unknown, LoadBalancerConfigRequest>({
    mutationFn: (payload: object) =>
      updateLoadBalancerConfigFn(configName, payload),
  });
};
