// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { APIRequestContext, expect } from '@playwright/test';

export const testMonitoringName = 'ui-test-monitoring';
export const testMonitoringName2 = 'ui-test-monitoring-1';

export const createMonitoringInstance = async (
  request: APIRequestContext,
  name: string,
  token: string
) => {
  const data = {
    type: 'pmm',
    name,
    url: 'http://monitoring',
    pmm: {
      apiKey: '123',
    },
  };

  const response = await request.post('/v1/monitoring-instances', {
    data,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok()).toBeTruthy();
  const created = await response.json();

  expect(created.name).toBe(data.name);
  expect(created.url).toBe(data.url);
  expect(created.type).toBe(data.type);
};

export const deleteMonitoringInstance = async (
  request: APIRequestContext,
  name,
  token: string
) => {
  const response = await request.delete(`/v1/monitoring-instances/${name}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
};

export const getMonitoringInstanceList = async (request) => {
  const response = await request.get('/v1/monitoring-instances');
  expect(response.ok()).toBeTruthy();
  return response.json();
};
