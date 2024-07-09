import { useDbCluster } from 'hooks/api/db-cluster/useDbCluster';
import React, { createContext } from 'react';
import { useParams } from 'react-router-dom';
import { DbCluster } from 'shared-types/dbCluster.types';
import { DbClusterContextProps } from './dbCluster.context.types';

export const DbClusterContext = createContext<DbClusterContextProps>({
  dbCluster: {} as DbCluster,
  isLoading: false,
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
  return (
    <DbClusterContext.Provider
      value={{
        dbCluster,
        isLoading,
      }}
    >
      {children}
    </DbClusterContext.Provider>
  );
};
