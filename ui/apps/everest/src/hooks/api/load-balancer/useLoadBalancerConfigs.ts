import { DbEngineType } from '@percona/types';
import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from '@tanstack/react-query';
import {
  createLoadBalancerConfigFn,
  deleteParticularLoadBalancerConfigFn,
  getLoadBalancerConfigsFn,
  getParticularLoadBalancerConfigFn,
  updateLoadBalancerConfigFn,
} from 'api/loadBalancer';
import {
  LoadBalancerConfig,
  LoadBalancerConfigList,
} from 'shared-types/loadbalancer.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const useLoadBalancerConfigs = (
  LOAD_BALANCER_CONFIGS_QUERY_KEY: string,
  dbType?: DbEngineType,
  options?: PerconaQueryOptions<LoadBalancerConfigList, unknown>
) =>
  useQuery({
    queryKey: [LOAD_BALANCER_CONFIGS_QUERY_KEY],
    queryFn: () => getLoadBalancerConfigsFn(dbType),
    select: (data) => ({
      ...data,
      items: (data.items || []).map((config) => ({
        ...config,
        metadata: {
          ...config.metadata,
          finalizers: config.metadata.finalizers || [],
        },
      })),
    }),
    ...options,
  });

export const useLoadBalancerConfig = (
  configName: string,
  options?: PerconaQueryOptions<LoadBalancerConfig, unknown, LoadBalancerConfig>
) =>
  useQuery({
    queryKey: ['load-balancer-config', configName],
    queryFn: () => getParticularLoadBalancerConfigFn(configName),
    select: (config) => ({
      ...config,
      metadata: {
        ...config.metadata,
        finalizers: config.metadata.finalizers || [],
      },
    }),
    enabled: !!configName,
    ...options,
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
  UPDATE_LOAD_BALANCER_CONFIG_QUERY_KEY: string,
  options?: UseMutationOptions<LoadBalancerConfig, unknown, LoadBalancerConfig>
) => {
  return useMutation<LoadBalancerConfig, unknown, LoadBalancerConfig>({
    mutationKey: [UPDATE_LOAD_BALANCER_CONFIG_QUERY_KEY, configName],
    mutationFn: (payload: LoadBalancerConfig) =>
      updateLoadBalancerConfigFn(configName, payload),
    ...options,
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
