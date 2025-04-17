import { api } from './api';

export const getPodSchedulingPolicy = async (name: string) => {
  const response = await api.get(`podschedulingpolicy/${name}`);
  return response;
};
