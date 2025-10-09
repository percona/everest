import { useQuery } from '@tanstack/react-query';
import { getAllSplitHorizonDNSConfigs } from 'api/splitHorizon';
import { SplitHorizonDNSConfig } from 'shared-types/splitHorizon.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const useSplitHorizonConfigs = (
  namespace: string,
  options?: PerconaQueryOptions<
    SplitHorizonDNSConfig[],
    unknown,
    SplitHorizonDNSConfig[]
  >
) => {
  return useQuery({
    queryKey: ['split-horizon-configs', namespace],
    queryFn: () => getAllSplitHorizonDNSConfigs(namespace),
    ...options,
  });
};
