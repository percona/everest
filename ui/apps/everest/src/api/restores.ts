import {
  CreateRestorePayload,
  GetRestorePayload,
} from 'shared-types/restores.types';
import { api } from './api';

export const createDbClusterRestore = async (
  data: CreateRestorePayload,
  namespace: string,
  cluster: string = 'in-cluster'
) => {
  const response = await api.post(
    `clusters/${cluster}/namespaces/${namespace}/database-cluster-restores`,
    data
  );

  return response.data;
};

export const getDbClusterRestores = async (
  namespace: string,
  dbClusterName: string,
  cluster: string = 'in-cluster'
) => {
  const response = await api.get<GetRestorePayload>(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters/${dbClusterName}/restores`
  );

  return response.data;
};

export const deleteRestore = async (
  namespace: string,
  restoreName: string,
  cluster: string = 'in-cluster'
) => {
  const response = await api.delete(
    `clusters/${cluster}/namespaces/${namespace}/database-cluster-restores/${restoreName}`
  );

  return response.data;
};
