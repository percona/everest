import { RestorePayload } from 'shared-types/restores.types';
import { api } from './api';

export const createDbClusterRestore = async (
  data: RestorePayload,
  namespace: string
) => {
  const response = await api.post(
    `namespaces/${namespace}/database-cluster-restores`,
    data
  );

  return response.data;
};
