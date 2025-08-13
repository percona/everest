import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createLoadBalancerConfigFn,
  deleteParticularLoadBalancerConfigFn,
  getLoadBalancerConfigsFn,
  getParticularLoadBalancerConfigFn,
  updateLoadBalancerConfigFn,
} from 'api/loadBalancer';
import {
  LoadBalancerConfigList,
  LoadBalancerConfigRequest,
} from 'shared-types/loadbalancer.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const useLoadBalancerConfigs = (
  LOAD_BALANCER_CONFIGS_QUERY_KEY: string,
  options?: PerconaQueryOptions<LoadBalancerConfigList, unknown>
) =>
  useQuery({
    queryKey: [LOAD_BALANCER_CONFIGS_QUERY_KEY],
    queryFn: getLoadBalancerConfigsFn,
    ...options,
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

export const useCreateLoadBalancerConfig = (
  CREATE_LOAD_BALANCER_CONFIG_QUERY_KEY: string
) => {
  return useMutation({
    mutationKey: [CREATE_LOAD_BALANCER_CONFIG_QUERY_KEY],
    mutationFn: (configName: string) => createLoadBalancerConfigFn(configName),
  });
};

export const useUpdateLoadBalancerConfig = (
  configName: string,
  UPDATE_LOAD_BALANCER_CONFIG_QUERY_KEY: string
) => {
  return useMutation({
    mutationKey: [UPDATE_LOAD_BALANCER_CONFIG_QUERY_KEY, configName],
    mutationFn: (payload: LoadBalancerConfigRequest) =>
      updateLoadBalancerConfigFn(configName, payload),
  });
};

export const useDeleteLoadBalancerConfig = (
  DELETE_LOAD_BALANCER_CONFIG_QUERY_KEY: string
) => {
  return useMutation({
    mutationKey: [DELETE_LOAD_BALANCER_CONFIG_QUERY_KEY],
    mutationFn: (configName: string) =>
      deleteParticularLoadBalancerConfigFn(configName),
  });
};
