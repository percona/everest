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
const { MONITORING_URL, MONITORING_USER, MONITORING_PASSWORD } = process.env;

export const testMonitoringName = 'ui-test-monitoring';
export const testMonitoringName2 = 'ui-test-monitoring-1';

export const createMonitoringInstance = async (
  request: APIRequestContext,
  name: string,
  namespace: string,
  token: string
) => {
  const data = {
    name,
    type: 'pmm',
    url: MONITORING_URL,
    allowedNamespaces: [],
    verifyTLS: false,
    pmm: {
      user: MONITORING_USER,
      password: MONITORING_PASSWORD,
    },
  };

  const response = await request.post(
    `/v1/namespaces/${namespace}/monitoring-instances`,
    {
      data,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  expect(response.ok()).toBeTruthy();
};

export const deleteMonitoringInstance = async (
  request: APIRequestContext,
  namespace,
  name,
  token: string
) => {
  const response = await request.delete(
    `/v1/namespaces/${namespace}/monitoring-instances/${name}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  expect(response.ok()).toBeTruthy();
};

export const listMonitoringInstances = async (
  request: APIRequestContext,
  namespace,
  token: string
) => {
  const response = await request.get(
    `/v1/namespaces/${namespace}/monitoring-instances`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  expect(response.ok()).toBeTruthy();

  const responseBody = await response.json();
  return responseBody;
};
