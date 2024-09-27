import { DbCluster } from 'shared-types/dbCluster.types';
import { QueryObserverResult } from '@tanstack/react-query';

export interface DbClusterContextProps {
  dbCluster?: DbCluster;
  isLoading: boolean;
  canReadBackups: boolean;
  canReadMonitoring: boolean;
  canUpdateMonitoring: boolean;
  canReadCredentials: boolean;
  queryResult: QueryObserverResult<DbCluster, unknown>;
  temporarilyIncreaseInterval: (interval: number, timeoutTime: number) => void;
}
