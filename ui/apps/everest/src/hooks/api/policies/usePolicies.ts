import { useQuery } from '@tanstack/react-query';
import { getRBACPolicies } from 'api/policies';

export const useRBACPolicies = () =>
  useQuery({
    queryKey: ['rbacPolicies'],
    queryFn: getRBACPolicies,
    refetchInterval: 5000,
  });
