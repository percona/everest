import { DbEngineType } from '@percona/types';
import { api } from './api';
import {
  PodSchedulingPolicy,
  PodSchedulingPolicyGetPayload,
} from 'shared-types/affinity.types';

export const getPodSchedulingPolicies = async (
  cluster: string,
  dbType?: DbEngineType,
  hasRules = false
) => {
  const response = await api.get<PodSchedulingPolicyGetPayload>(
    `clusters/${cluster}/pod-scheduling-policies`,
    {
      params: {
        ...(dbType && { engineType: dbType }),
        hasRules,
      },
    }
  );
  return response.data;
};

export const getPodSchedulingPolicy = async (cluster: string, name: string) => {
  const response = await api.get<PodSchedulingPolicy>(
    `clusters/${cluster}/pod-scheduling-policies/${name}`
  );
  return response.data;
};

export const createPodSchedulingPolicy = async (
  cluster: string,
  name: string,
  dbType: DbEngineType
) => {
  const response = await api.post(`clusters/${cluster}/pod-scheduling-policies`, {
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
  cluster: string,
  policy: PodSchedulingPolicy
) => {
  const response = await api.put<PodSchedulingPolicy>(
    `clusters/${cluster}/pod-scheduling-policies/${policy.metadata.name}`,
    policy,
    {
      disableNotifications: (e) => e.status === 409,
    }
  );
  return response.data;
};

export const deletePodSchedulingPolicy = async (cluster: string, name: string) => {
  const response = await api.delete(`clusters/${cluster}/pod-scheduling-policies/${name}`);
  return response;
};
