import { api } from './api';
import rbac from '/public/static/model.conf?raw';

type RBACPoliciesPayload = {
  permissions: string[][];
};

export type RBACPolicies = {
  m: string;
  p: string[][];
};

export const getRBACPolicies = async (): Promise<RBACPolicies> => {
  const response = await api.get<RBACPoliciesPayload>('permissions');
  const permissions = response.data.permissions.map((permission: string[]) => {
    return [...'p', ...permission];
  });

  return {
    m: rbac,
    p: permissions,
  };
};
