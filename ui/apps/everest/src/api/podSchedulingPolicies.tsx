import { DbEngineType } from '@percona/types';
import { api } from './api';
import { PodSchedulingPolicy } from 'shared-types/affinity.types';

export const getPodSchedulingPolicy = async (name: string) => {
  const response = await api.get<PodSchedulingPolicy>(
    `pod-scheduling-policies/${name}`
  );
  return response.data;
};

export const createPodSchedulingPolicy = async (
  name: string,
  dbType: DbEngineType
) => {
  const response = await api.post('pod-scheduling-policies', {
    metadata: {
      name,
    },
    spec: {
      engineType: dbType,
    },
  });
  return response;
};
