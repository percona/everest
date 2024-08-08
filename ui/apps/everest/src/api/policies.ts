import { api } from './api';
import rbac from '/public/static/model.conf?raw';

export const getRBACPolicies = async () => {
  const response = await api.get('permissions');
  const permissions = response.data.permissions.map((permission: string[]) => {
    return [...'p', ...permission];
  });

  return {
    m: rbac,
    p: permissions,
  };
};
