import { DataImporters } from 'shared-types/dataImporters.types';
import { api } from './api';

export const getImportersFn = async (supportedEngine: string) => {
  const response = await api.get<DataImporters>('data-importers', {
    params: { supportedEngine: supportedEngine },
  });

  return response.data;
};
