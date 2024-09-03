import { useDbCluster } from 'hooks/api/db-cluster/useDbCluster';
import React, { createContext } from 'react';
import { useParams } from 'react-router-dom';
import { DbCluster } from 'shared-types/dbCluster.types';
import { DbClusterContextProps } from './dbCluster.context.types';
import { useGetPermissions } from 'utils/useGetPermissions';

export const DbClusterContext = createContext<DbClusterContextProps>({
  dbCluster: {} as DbCluster,
  isLoading: false,
  canReadBackups: false,
  canReadMonitoring: false,
  canUpdateMonitoring: false,
  canReadCredentials: false,
});

export const DbClusterContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { dbClusterName = '', namespace = '' } = useParams();
  const { data: dbCluster, isLoading } = useDbCluster(
    dbClusterName,
    namespace,
    {
      enabled: !!namespace && !!dbClusterName,
      refetchInterval: 5 * 1000,
    }
  );

  const { canRead: canReadBackups } = useGetPermissions({
    resource: 'database-cluster-backups',
    specificResource: dbClusterName,
    namespace: namespace,
  });
  const { canRead: canReadMonitoring, canUpdate: canUpdateMonitoring } =
    useGetPermissions({
      resource: 'monitoring-instances',
      namespace: namespace,
    });

  const { canRead: canReadCredentials } = useGetPermissions({
    resource: 'database-cluster-credentials',
    specificResource: dbClusterName,
    namespace: namespace,
  });

  return (
    <DbClusterContext.Provider
      value={{
        dbCluster,
        isLoading,
        canReadBackups,
        canReadMonitoring,
        canUpdateMonitoring,
        canReadCredentials,
      }}
    >
      {children}
    </DbClusterContext.Provider>
  );
};
