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

export const useLoadBalancerConfigs = (
  LOAD_BALANCER_CONFIGS_QUERY_KEY: string
) =>
  useQuery({
    queryKey: [LOAD_BALANCER_CONFIGS_QUERY_KEY],
    queryFn: getLoadBalancerConfigsFn,
  });

export const useLoadBalancerConfig = (
  configName: string,
  LOAD_BALANCER_CONFIG_QUERY_KEY: string
) =>
  useQuery({
    queryKey: [LOAD_BALANCER_CONFIG_QUERY_KEY, configName],
    queryFn: () => getParticularLoadBalancerConfigFn(configName),
    enabled: !!configName,
  });

export const useCreateLoadBalancerConfig = () => {
  return useMutation({
    mutationFn: (payload: LoadBalancerConfigRequest) =>
      createLoadBalancerConfigFn(payload),
  });
};

export const useUpdateLoadBalancerConfig = (configName: string) => {
  return useMutation({
    mutationFn: (payload: LoadBalancerConfigRequest) =>
      updateLoadBalancerConfigFn(configName, payload),
  });
};

export const useDeleteLoadBalancerConfig = (configName: string) => {
  return useMutation({
    mutationFn: () => deleteParticularLoadBalancerConfigFn(configName),
  });
};
