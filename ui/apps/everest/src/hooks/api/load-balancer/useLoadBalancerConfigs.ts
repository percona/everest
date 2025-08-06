import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createLoadBalancerConfigFn,
  deleteParticularLoadBalancerConfigFn,
  getLoadBalancerConfigsFn,
  getParticularLoadBalancerConfigFn,
  updateLoadBalancerConfigFn,
} from 'api/loadBalancer';

export const useLoadBalancerConfigs = () =>
  // TODO add types
  useQuery({
    queryKey: ['load-balancer-configs'],
    queryFn: getLoadBalancerConfigsFn,
  });

export const useLoadBalancerConfig = (configName: string) =>
  useQuery({
    queryKey: ['load-balancer-config', configName],
    queryFn: () => getParticularLoadBalancerConfigFn(configName),
    enabled: !!configName,
  });

export const useCreateLoadBalancerConfig = () => {
  return useMutation({
    mutationFn: (payload: object) => createLoadBalancerConfigFn(payload),
  });
};

export const useDeleteLoadBalancerConfig = (configName: string) => {
  return useMutation({
    mutationFn: () => deleteParticularLoadBalancerConfigFn(configName),
  });
};

export const useUpdateLoadBalancerConfig = (configName: string) => {
  return useMutation({
    mutationFn: (payload: object) =>
      updateLoadBalancerConfigFn(configName, payload),
  });
};
