import { UseQueryOptions, useQuery } from 'react-query';
import { getVersionFn } from 'api/version';
import { EverestVersion } from 'shared-types/version.types';

export const useVersion = (
  options?: Omit<UseQueryOptions<EverestVersion>, 'queryKey' | 'queryFn'>
) => useQuery('everest-version', () => getVersionFn(), options);
