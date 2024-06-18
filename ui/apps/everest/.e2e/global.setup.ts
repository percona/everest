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

import { test as setup, expect, APIResponse } from '@playwright/test';
import 'dotenv/config';
import { STORAGE_NAMES } from './constants';
import { getTokenFromLocalStorage } from './utils/localStorage';
import { getNamespacesFn } from './utils/namespaces';
const {
  EVEREST_LOCATION_BUCKET_NAME,
  EVEREST_LOCATION_ACCESS_KEY,
  EVEREST_LOCATION_SECRET_KEY,
  EVEREST_LOCATION_REGION,
  EVEREST_LOCATION_URL,
} = process.env;

const doBackupCall = async (fn: () => Promise<APIResponse>, retries = 3) => {
  if (retries === 0) {
    return Promise.reject();
  }

  try {
    const response = await fn();
    const statusText = await response.json();
    const ok = response.ok();

    if (ok) {
      return Promise.resolve();
    }

    if (statusText && statusText.message) {
      if (statusText.message.includes('already exists')) {
        return Promise.resolve();
      } else if (statusText.message.includes('Could not read')) {
        if (retries > 0) {
          return doBackupCall(fn, retries - 1);
        }
      }
    }
    return Promise.reject();
  } catch (error) {
    return Promise.reject();
  }
};

setup('Backup storages', async ({ request }) => {
  const token = await getTokenFromLocalStorage();
  const namespaces = await getNamespacesFn(token, request);
  const promises: Promise<any>[] = [];

  STORAGE_NAMES.forEach(async (storage) => {
    promises.push(
      doBackupCall(() =>
        request.post('/v1/backup-storages/', {
          data: {
            name: storage,
            description: 'CI test bucket',
            type: 's3',
            bucketName: EVEREST_LOCATION_BUCKET_NAME,
            secretKey: EVEREST_LOCATION_SECRET_KEY,
            accessKey: EVEREST_LOCATION_ACCESS_KEY,
            allowedNamespaces: [namespaces[0]],
            url: EVEREST_LOCATION_URL,
            region: EVEREST_LOCATION_REGION,
            verifyTLS: false,
            forcePathStyle: true,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      )
    );
  });

  await Promise.all(promises);
});

setup('Close modal permanently', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('close-dialog-icon')).toBeVisible();
  await page.getByTestId('close-dialog-icon').click();
  await page.context().storageState({ path: 'user.json' });
});

// setup('Monitoring setup', async ({ request }) => {
//   await createMonitoringInstance(request, testMonitoringName);
//   await createMonitoringInstance(request, testMonitoringName2);
// });
