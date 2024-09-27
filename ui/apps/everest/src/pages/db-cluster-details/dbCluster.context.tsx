import { useDbCluster } from 'hooks/api/db-cluster/useDbCluster';
import React, { createContext } from 'react';
import { useParams } from 'react-router-dom';
import { DbCluster } from 'shared-types/dbCluster.types';
import { DbClusterContextProps } from './dbCluster.context.types';
import { useRBACPermissions } from 'hooks/rbac';
import { useState } from 'react';
import { QueryObserverResult } from '@tanstack/react-query';

export const DbClusterContext = createContext<DbClusterContextProps>({
  dbCluster: {} as DbCluster,
  isLoading: false,
  canReadBackups: false,
  canReadMonitoring: false,
  canUpdateMonitoring: false,
  canReadCredentials: false,
  temporarilyIncreaseInterval: () => {},
  queryResult: {} as QueryObserverResult<DbCluster, unknown>,
});

export const DbClusterContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { dbClusterName = '', namespace = '' } = useParams();
  const defaultInterval = 5 * 1000;
  const [refetchInterval, setRefetchInterval] = useState(defaultInterval);
  const queryResult: QueryObserverResult<DbCluster, unknown> = useDbCluster(
    dbClusterName,
    namespace,
    {
      enabled: !!namespace && !!dbClusterName,
      refetchInterval: refetchInterval,
    }
  );

  const { data: dbCluster, isLoading } = queryResult;

  const temporarilyIncreaseInterval = (
    interval: number,
    timeoutTime: number
  ) => {
    setRefetchInterval(interval);
    const a = setTimeout(() => {
      setRefetchInterval(defaultInterval), clearTimeout(a);
    }, timeoutTime);
  };

  const { canRead: canReadBackups } = useRBACPermissions(
    'database-cluster-backups',
    `${namespace}/${dbClusterName}`
  );
  const { canRead: canReadMonitoring, canUpdate: canUpdateMonitoring } =
    useRBACPermissions('monitoring-instances', `${namespace}/*`);
  const { canRead: canReadCredentials } = useRBACPermissions(
    'database-cluster-credentials',
    `${namespace}/${dbClusterName}`
  );

  return (
    <DbClusterContext.Provider
      value={{
        dbCluster,
        isLoading,
        canReadBackups,
        canReadMonitoring,
        canUpdateMonitoring,
        canReadCredentials,
        temporarilyIncreaseInterval,
        queryResult,
      }}
    >
      {children}
    </DbClusterContext.Provider>
  );
};
