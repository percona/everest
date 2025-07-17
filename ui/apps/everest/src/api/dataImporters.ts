import { DataImporters } from 'shared-types/dataImporters.types';
import { api } from './api';

export const getImportersFn = async (supportedEngines?: string) => {
  const config = supportedEngines
    ? { params: { supportedEngines } }
    : undefined;
  const response = await api.get<DataImporters>('data-importers', config);
  return response.data;
};
