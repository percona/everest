import { DbCluster } from 'shared-types/dbCluster.types';

export interface DbClusterContextProps {
  dbCluster?: DbCluster;
  isLoading: boolean;
}
