import { SplitHorizonDNSConfig } from 'shared-types/splitHorizon.types';
import { api } from './api';

export const getAllSplitHorizonDNSConfigs = async (
  namespace: string
): Promise<Array<SplitHorizonDNSConfig & { namespace: string }>> => {
  const response = await api.get<{ items: SplitHorizonDNSConfig[] }>(
    `namespaces/${namespace}/engine-features/split-horizon-dns-config`
  );
  return response.data.items.map((config) => ({
    ...config,
    namespace,
  }));
};

export const getSplitHorizonDNSConfig = async (
  namespace: string,
  name: string
) => {
  const response = await api.get<SplitHorizonDNSConfig>(
    `namespaces/${namespace}/engine-features/split-horizon-dns-config/${name}`
  );
  return response.data;
};

export const createSplitHorizonDNSConfig = async (
  namespace: string,
  config: SplitHorizonDNSConfig
) => {
  const response = await api.post<SplitHorizonDNSConfig>(
    `namespaces/${namespace}/engine-features/split-horizon-dns-config`,
    config
  );
  return response.data;
};

export const updateSplitHorizonDNSConfig = async (
  namespace: string,
  name: string,
  config: SplitHorizonDNSConfig
) => {
  const response = await api.put<SplitHorizonDNSConfig>(
    `namespaces/${namespace}/engine-features/split-horizon-dns-config/${name}`,
    config
  );
  return response.data;
};

export const deleteSplitHorizonDNSConfig = async (
  namespace: string,
  name: string
) => {
  const response = await api.delete<SplitHorizonDNSConfig>(
    `namespaces/${namespace}/engine-features/split-horizon-dns-config/${name}`
  );
  return response.data;
};
