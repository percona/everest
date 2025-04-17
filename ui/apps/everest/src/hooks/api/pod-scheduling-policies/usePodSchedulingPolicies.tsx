import { useQuery } from '@tanstack/react-query';
import { getPodSchedulingPolicy } from 'api/podSchedulingPolicies';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const usePodSchedulingPolicy = (
  policyName: string,
  options?: PerconaQueryOptions
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
