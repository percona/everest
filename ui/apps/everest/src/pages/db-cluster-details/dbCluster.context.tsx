import { useDbCluster } from 'hooks/api/db-cluster/useDbCluster';
import React, { createContext } from 'react';
import { useParams } from 'react-router-dom';
import { DbCluster } from 'shared-types/dbCluster.types';
import { DbClusterContextProps } from './dbCluster.context.types';
import { useRBACPermissions } from 'hooks/rbac';

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
      }}
    >
      {children}
    </DbClusterContext.Provider>
  );
};
