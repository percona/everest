import { DbEngineType } from '@percona/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createPodSchedulingPolicy,
  deletePodSchedulingPolicy,
  getPodSchedulingPolicies,
  getPodSchedulingPolicy,
  updatePodSchedulingPolicy,
} from 'api/podSchedulingPolicies';
import {
  PodSchedulingPolicy,
  PodSchedulingPolicyGetPayload,
} from 'shared-types/affinity.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const usePodSchedulingPolicies = (
  dbType?: DbEngineType,
  hasRules = false,
  options?: PerconaQueryOptions<
    PodSchedulingPolicyGetPayload,
    unknown,
    PodSchedulingPolicy[]
  >
) => {
  return useQuery({
    queryKey: ['pod-scheduling-policies', dbType],
    queryFn: () => getPodSchedulingPolicies(dbType, hasRules),
    select: (data) =>
      (data.items || []).map((policy) => ({
        ...policy,
        metadata: {
          ...policy.metadata,
          finalizers: policy.metadata.finalizers || [],
        },
      })),
    ...options,
  });
};

export const usePodSchedulingPolicy = (
  policyName: string,
  options?: PerconaQueryOptions<PodSchedulingPolicy>
) => {
  return useQuery({
    queryKey: ['pod-scheduling-policy', policyName],
    queryFn: () => getPodSchedulingPolicy(policyName),
    select: (policy) => ({
      ...policy,
      metadata: {
        ...policy.metadata,
        finalizers: policy.metadata.finalizers || [],
      },
    }),
    ...options,
  });
};

export const useCreatePodSchedulingPolicy = () => {
  return useMutation({
    mutationKey: ['create-pod-scheduling-policy'],
    mutationFn: (args: { policyName: string; dbType: DbEngineType }) =>
      createPodSchedulingPolicy(args.policyName, args.dbType),
  });
};

export const useUpdatePodSchedulingPolicy = () => {
  return useMutation({
    mutationKey: ['update-pod-scheduling-policy'],
    mutationFn: (policy: PodSchedulingPolicy) =>
      updatePodSchedulingPolicy(policy),
  });
};

export const useDeletePodSchedulingPolicy = () => {
  return useMutation({
    mutationKey: ['delete-pod-scheduling-policy'],
    mutationFn: (policyName: string) => deletePodSchedulingPolicy(policyName),
  });
};
