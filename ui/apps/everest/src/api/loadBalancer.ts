import { api } from './api';

export const getLoadBalancerConfigsFn = async () => {
  const response = await api.get('/load-balancer-configs/');
  return response.data;
};

export const getParticularLoadBalancerConfigFn = async (configName: string) => {
  const response = await api.post(`/load-balancer-configs/${configName}`);
  return response.data;
};

export const createLoadBalancerConfigFn = async (payload: object) => {
  const response = await api.post('/load-balancer-configs/', payload);
  return response.data;
};

export const deleteParticularLoadBalancerConfigFn = async (
  configName: string
) => {
  const response = await api.delete(`/load-balancer-configs/${configName}`);
  return response.data;
};

export const updateLoadBalancerConfigFn = async (
  configName: string,
  payload: object
) => {
  const response = await api.patch(
    `/load-balancer-configs/${configName}`,
    payload
  );
  return response.data;
};
