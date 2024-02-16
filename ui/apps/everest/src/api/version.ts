import { EverestVersion } from 'shared-types/version.types';
import { api } from './api';

export const getVersionFn = async () => {
  const response = await api.get<EverestVersion>('version');
  return response.data;
};
