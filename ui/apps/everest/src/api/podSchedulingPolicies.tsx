import { DbEngineType } from '@percona/types';
import { api } from './api';
import {
  PodSchedulingPolicy,
  PodSchedulingPolicyGetPayload,
} from 'shared-types/affinity.types';

export const getPodSchedulingPolicies = async () => {
  const response = await api.get<PodSchedulingPolicyGetPayload>(
    'pod-scheduling-policies'
  );
  return response.data;
};

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

export const updatePodSchedulingPolicy = async (
  name: string,
  policy: PodSchedulingPolicy
) => {
  const response = await api.put(`pod-scheduling-policies/${name}`, policy);
  return response;
};

export const deletePodSchedulingPolicy = async (name: string) => {
  const response = await api.delete(`pod-scheduling-policies/${name}`);
  return response;
};
