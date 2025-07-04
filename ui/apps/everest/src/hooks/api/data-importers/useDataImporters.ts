import { useQuery } from '@tanstack/react-query';
import { getImportersFn } from 'api/dataImporters';
import { DataImporters } from 'shared-types/dataImporters.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const DATA_IMPORTERS_KEY = 'dataImporters';

export const useDataImporters = (
  supportedEngine?: string,
  options?: PerconaQueryOptions<DataImporters, unknown, DataImporters>
) => {
  return useQuery<DataImporters, unknown, DataImporters>({
    queryKey: [DATA_IMPORTERS_KEY],
    queryFn: () => getImportersFn(supportedEngine || ''),
    refetchInterval: 5 * 1000,
    ...options,
  });
};
