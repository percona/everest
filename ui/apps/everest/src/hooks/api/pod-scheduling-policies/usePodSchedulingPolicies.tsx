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

export const POD_SCHEDULING_POLICIES_KEY = 'pod-scheduling-policies';

export const usePodSchedulingPolicies = (
  cluster: string = 'in-cluster',
  dbType?: DbEngineType,
  hasRules = false,
  options?: PerconaQueryOptions<
    PodSchedulingPolicyGetPayload,
    unknown,
    PodSchedulingPolicy[]
  >
) => {
  return useQuery({
    queryKey: [POD_SCHEDULING_POLICIES_KEY, cluster, dbType],
    queryFn: () => getPodSchedulingPolicies(cluster, dbType, hasRules),
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
  cluster: string = 'in-cluster',
  options?: PerconaQueryOptions<PodSchedulingPolicy>
) => {
  return useQuery({
    queryKey: [POD_SCHEDULING_POLICIES_KEY, cluster, policyName],
    queryFn: () => getPodSchedulingPolicy(cluster, policyName),
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
    mutationFn: (args: { policyName: string; dbType: DbEngineType; cluster?: string }) =>
      createPodSchedulingPolicy(args.cluster || 'in-cluster', args.policyName, args.dbType),
  });
};

export const useUpdatePodSchedulingPolicy = () => {
  return useMutation({
    mutationKey: ['update-pod-scheduling-policy'],
    mutationFn: (args: { policy: PodSchedulingPolicy; cluster?: string }) =>
      updatePodSchedulingPolicy(args.cluster || 'in-cluster', args.policy),
  });
};

export const useDeletePodSchedulingPolicy = () => {
  return useMutation({
    mutationKey: ['delete-pod-scheduling-policy'],
    mutationFn: (args: { policyName: string; cluster?: string }) =>
      deletePodSchedulingPolicy(args.cluster || 'in-cluster', args.policyName),
  });
};
