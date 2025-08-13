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
  LoadBalancerConfigListResponse,
  LoadBalancerConfigRequest,
} from 'shared-types/loadbalancer.types';

export const useLoadBalancerConfigs = (
  LOAD_BALANCER_CONFIGS_QUERY_KEY: string
) =>
  useQuery<LoadBalancerConfigListResponse>({
    queryKey: [LOAD_BALANCER_CONFIGS_QUERY_KEY],
    queryFn: getLoadBalancerConfigsFn,
  });

export const useLoadBalancerConfig = (
  configName: string,
  LOAD_BALANCER_CONFIG_QUERY_KEY: string
) =>
  useQuery<LoadBalancerConfig>({
    queryKey: [LOAD_BALANCER_CONFIG_QUERY_KEY, configName],
    queryFn: () => getParticularLoadBalancerConfigFn(configName),
    enabled: !!configName,
  });

export const useCreateLoadBalancerConfig = () => {
  return useMutation<LoadBalancerConfig, unknown, LoadBalancerConfigRequest>({
    mutationFn: (payload: LoadBalancerConfigRequest) =>
      createLoadBalancerConfigFn(payload),
  });
};

export const useUpdateLoadBalancerConfig = (configName: string) => {
  return useMutation<LoadBalancerConfig, unknown, LoadBalancerConfigRequest>({
    mutationFn: (payload: LoadBalancerConfigRequest) =>
      updateLoadBalancerConfigFn(configName, payload),
  });
};

export const useDeleteLoadBalancerConfig = (configName: string) => {
  return useMutation<unknown, unknown, void>({
    mutationFn: () => deleteParticularLoadBalancerConfigFn(configName),
  });
};
