import {
  LoadBalancerConfig,
  LoadBalancerConfigList,
} from 'shared-types/loadbalancer.types';
import { api } from './api';

const loadBalancerUrl = '/load-balancer-configs';

export const getLoadBalancerConfigsFn = async () => {
  const response = await api.get<LoadBalancerConfigList>(`${loadBalancerUrl}`);

  return response.data;
};

export const getParticularLoadBalancerConfigFn = async (configName: string) => {
  const response = await api.get<LoadBalancerConfig>(
    `${loadBalancerUrl}/${configName}`
  );
  return response.data;
};

export const createLoadBalancerConfigFn = async (name: string) => {
  const response = await api.post<LoadBalancerConfig>(`${loadBalancerUrl}`, {
    metadata: {
      name,
    },
    spec: {
      annotations: {},
    },
  });

  return response.data;
};

export const updateLoadBalancerConfigFn = async (
  configName: string,
  payload: LoadBalancerConfig
) => {
  const response = await api.put(`${loadBalancerUrl}/${configName}`, payload);
  return response.data;
};

export const deleteParticularLoadBalancerConfigFn = async (
  configName: string
) => {
  const response = await api.delete(`${loadBalancerUrl}/${configName}`);
  return response.data;
};
