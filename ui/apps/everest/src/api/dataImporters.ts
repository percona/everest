import { DataImporters } from 'shared-types/dataImporters.types';
import { api } from './api';

export const getImportersFn = async (supportedEngine?: string) => {
  const config = supportedEngine ? { params: { supportedEngine } } : undefined;
  const response = await api.get<DataImporters>('data-importers', config);
  return response.data;
};
