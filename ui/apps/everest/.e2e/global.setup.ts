// percona-everest-frontend
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

import { test as setup, expect } from '@playwright/test';
import 'dotenv/config';
import { getTokenFromLocalStorage } from './utils/localStorage';
import { getNamespacesFn } from './utils/namespaces';
const {
  EVEREST_LOCATION_BUCKET_NAME,
  EVEREST_LOCATION_ACCESS_KEY,
  EVEREST_LOCATION_SECRET_KEY,
  EVEREST_LOCATION_REGION,
  EVEREST_LOCATION_URL,
} = process.env;

setup('Backup storage', async ({ request }) => {
  const token = await getTokenFromLocalStorage();
  const namespaces = await getNamespacesFn(token, request);
  const response = await request.post('/v1/backup-storages/', {
    data: {
      name: 'ui-dev',
      description: 'CI test bucket',
      type: 's3',
      bucketName: EVEREST_LOCATION_BUCKET_NAME,
      secretKey: EVEREST_LOCATION_SECRET_KEY,
      accessKey: EVEREST_LOCATION_ACCESS_KEY,
      targetNamespaces: [namespaces[0]],
      url: EVEREST_LOCATION_URL,
      region: EVEREST_LOCATION_REGION,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
});

setup('Close modal permanently', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('close-dialog-icon').click();
  await page.context().storageState({ path: 'user.json' });
});

// setup('Monitoring setup', async ({ request }) => {
//   await createMonitoringInstance(request, testMonitoringName);
//   await createMonitoringInstance(request, testMonitoringName2);
// });
