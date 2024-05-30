import { EverestConfigPayload } from 'shared-types/configs.types';
import { api } from './api';

export const getEverestConfigs = async () => {
  // const response = await api.get<EverestConfigPayload>('/settings');

  // return response.data;

  // TODO replace with API call
  return {
    oidc: {
      clientId: '0oaes7mtfpYjxn2d81d7',
      issuerURL: 'https://id-dev.percona.com/oauth2/default',
    },
  };
};
