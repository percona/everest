import { useQuery } from '@tanstack/react-query';
import { getAllSplitHorizonDNSConfigs } from 'api/splitHorizon';

export const useSplitHorizonConfigs = (namespace: string) => {
  return useQuery({
    queryKey: ['split-horizon-configs', namespace],
    queryFn: () => getAllSplitHorizonDNSConfigs(namespace),
  });
};
