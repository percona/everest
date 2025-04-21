import { DbEngineType } from '@percona/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createPodSchedulingPolicy,
  getPodSchedulingPolicy,
  updatePodSchedulingPolicy,
} from 'api/podSchedulingPolicies';
import { PodSchedulingPolicy } from 'shared-types/affinity.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const usePodSchedulingPolicy = (
  policyName: string,
  options?: PerconaQueryOptions<PodSchedulingPolicy>
) => {
  // const { canRead } = useRBACPermissions(
  //   'database-clusters',
  //   `${namespace}/${dbClusterName}`
  // );
  return useQuery({
    queryKey: ['pod-scheduling-policy', policyName],
    queryFn: () => getPodSchedulingPolicy(policyName),
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
      updatePodSchedulingPolicy(policy.metadata.name, policy),
  });
};

// export const useDeletePodSchedulingPolicy = () => {
//   return useMutation({
//     mutationKey: ['delete-pod-scheduling-policy'],
//     mutationFn: (args: { policyName: string }) =>
//       createPodSchedulingPolicy(args.policyName, 'mysql'),
//   });
// };
