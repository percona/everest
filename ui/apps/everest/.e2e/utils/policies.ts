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
