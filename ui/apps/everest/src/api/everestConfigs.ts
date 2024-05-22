import { EverestConfigPayload } from 'shared-types/configs.types';
import { api } from './api';

export const getEverestConfigs = async () => {
  const response = await api.get<EverestConfigPayload>('/everest-configs');

  return response.data;
};
