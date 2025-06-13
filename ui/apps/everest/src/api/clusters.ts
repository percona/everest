import { api } from './api';

export interface Cluster {
  name: string;
  server: string;
}

export const getClustersFn = async (): Promise<Cluster[]> => {
  const response = await api.get<{ items: Cluster[] }>('clusters');
  return response.data.items;
};
