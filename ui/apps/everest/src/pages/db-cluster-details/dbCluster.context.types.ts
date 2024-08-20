import { DbCluster } from 'shared-types/dbCluster.types';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';

export interface DbClusterContextProps {
  dbCluster?: DbCluster;
  isLoading: boolean;
  refetch: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<DbCluster, unknown>>;
}
