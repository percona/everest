import { getTokenFromLocalStorage } from './localStorage';
import { getNamespacesFn } from './namespaces';
import { APIRequestContext, expect } from '@playwright/test';
const {
  EVEREST_LOCATION_BUCKET_NAME,
  EVEREST_LOCATION_ACCESS_KEY,
  EVEREST_LOCATION_SECRET_KEY,
  EVEREST_LOCATION_REGION,
  EVEREST_LOCATION_URL,
} = process.env;

export const createBackupStorageFn = async (
  request: APIRequestContext,
  name: string,
  namespacesList?: string[]
) => {
  const token = await getTokenFromLocalStorage();
  const namespaces: string[] = namespacesList ?? [
    (await getNamespacesFn(token, request))[0],
  ];
  const data = {
    name: name,
    description: 'CI test bucket',
    type: 's3',
    bucketName: EVEREST_LOCATION_BUCKET_NAME,
    secretKey: EVEREST_LOCATION_SECRET_KEY,
    accessKey: EVEREST_LOCATION_ACCESS_KEY,
    allowedNamespaces: namespaces,
    url: EVEREST_LOCATION_URL,
    region: EVEREST_LOCATION_REGION,
    verifyTLS: false,
    forcePathStyle: true,
  };

  const response = await request.post('/v1/backup-storages/', {
    data: data,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
};

export const deleteStorageLocationFn = async (
  request: APIRequestContext,
  name: string
) => {
  const token = await getTokenFromLocalStorage();
  const response = await request.delete(`/v1/backup-storages/${name}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok()).toBeTruthy();
};
