import { api } from './api';
import { GetNamespacesPayload } from 'shared-types/namespaces.types';

export const getNamespacesFn = async () => {
  const response = await api.get<GetNamespacesPayload>('namespaces');
  return response.data;
};
