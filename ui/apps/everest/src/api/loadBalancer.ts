import {
  LoadBalancerConfigList,
  LoadBalancerConfigRequest,
} from 'shared-types/loadbalancer.types';
import { api } from './api';

const loadBalancerUrl = '/load-balancer-configs';

export const getLoadBalancerConfigsFn = async () => {
  const response = await api.get<LoadBalancerConfigList>(`${loadBalancerUrl}/`);

  return response.data;
};

export const getParticularLoadBalancerConfigFn = async (configName: string) => {
  const response = await api.post(`${loadBalancerUrl}/${configName}`);
  return response.data;
};

export const createLoadBalancerConfigFn = async (
  payload: LoadBalancerConfigRequest
) => {
  const response = await api.post(`${loadBalancerUrl}/`, payload);
  return response.data;
};

export const updateLoadBalancerConfigFn = async (
  configName: string,
  payload: LoadBalancerConfigRequest
) => {
  const response = await api.patch(`${loadBalancerUrl}/${configName}`, payload);
  return response.data;
};

export const deleteParticularLoadBalancerConfigFn = async (
  configName: string
) => {
  const response = await api.delete(`${loadBalancerUrl}/${configName}`);
  return response.data;
};
