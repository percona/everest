import { APIRequestContext, expect } from '@playwright/test';
export const getNamespacesFn = async (
  token: string,
  request: APIRequestContext
) => {
  const namespacesInfo = await request.get('/v1/namespaces', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(namespacesInfo.ok()).toBeTruthy();
  return namespacesInfo.json();
};
