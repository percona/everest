import { useQuery } from '@tanstack/react-query';
import { getVersionFn } from 'api/version';
import { PerconaQueryOptions } from 'shared-types/query.types';
import { EverestVersion } from 'shared-types/version.types';

export const useVersion = (options?: PerconaQueryOptions<EverestVersion>) =>
  useQuery({
    queryKey: ['everest-version'],
    queryFn: getVersionFn,
    ...options,
  });
