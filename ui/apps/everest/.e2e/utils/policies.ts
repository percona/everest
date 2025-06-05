import { APIRequestContext, expect } from '@playwright/test';
import { getTokenFromLocalStorage } from './localStorage';

export const createPodSchedulingPolicy = async (
  request: APIRequestContext,
  name: string,
  dbType: string
) => {
  const response = await request.post(`/v1/pod-scheduling-policies`, {
    data: {
      metadata: {
        name,
      },
      spec: {
        engineType: dbType,
      },
    },
    headers: {
      Authorization: `Bearer ${await getTokenFromLocalStorage()}`,
    },
  });

  expect(response.ok()).toBeTruthy();
};

export const deletePodSchedulingPolicy = async (
  request: APIRequestContext,
  name: string
) => {
  const response = await request.delete(`/v1/pod-scheduling-policies/${name}`, {
    headers: {
      Authorization: `Bearer ${await getTokenFromLocalStorage()}`,
    },
  });

  expect(response.ok()).toBeTruthy();
};

export const getDefaultPodSchedulingPolicyNameForDbType = (
  dbType: string
): string => {
  switch (dbType) {
    case 'psmdb':
      return 'everest-default-mongodb';
    case 'pxc':
      return 'everest-default-mysql';
    case 'postgresql':
      return 'everest-default-postgresql';
    default:
      throw new Error(`Unknown database type: ${dbType}`);
  }
};
