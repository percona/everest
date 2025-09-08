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
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { getBucketNamespacesMap } from '../constants';
import { saveOldRBACPermissions } from '@e2e/utils/rbac-cmd-line';
const {
  EVEREST_LOCATION_ACCESS_KEY,
  EVEREST_LOCATION_SECRET_KEY,
  EVEREST_LOCATION_REGION,
  EVEREST_LOCATION_URL,
  EVEREST_S3_ACCESS_KEY,
  EVEREST_S3_SECRET_KEY,
  EVEREST_S3_REGION,
  EVEREST_S3_URL,
  MONITORING_URL,
  MONITORING_USER,
  MONITORING_PASSWORD,
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

    if (
      response.status() === 409 ||
      (response.status() === 400 &&
        statusText?.message &&
        statusText?.message.includes('same url'))
    ) {
      return Promise.resolve();
    }

    if (response.status() !== 201 && response.status() !== 200) {
      return Promise.reject();
    }

    if (statusText && statusText.message) {
      if (statusText.message.includes('Could not read')) {
        if (retries > 0) {
          return doBackupCall(fn, retries - 1);
        }
      } else {
        return Promise.resolve();
      }
    }
    return Promise.reject();
  } catch (error) {
    return Promise.reject();
  }
};

setup('Backup storages', async ({ request }) => {
  const token = await getTokenFromLocalStorage();
  const promises: Promise<any>[] = [];
  // This has a nested array structure, in the form of
  // [
  //   ['bucket1', 'namespace1'],
  //   ['bucket2', 'namespace2'],
  // ]
  const bucketNamespacesMap = getBucketNamespacesMap();

  bucketNamespacesMap.forEach(async ([bucket, namespace]) => {
    const isEverestTesting = bucket === 'everest-testing';
    const data = isEverestTesting
      ? {
          name: bucket,
          description: 'CI test S3 bucket',
          type: 's3',
          bucketName: bucket,
          secretKey: EVEREST_S3_SECRET_KEY,
          accessKey: EVEREST_S3_ACCESS_KEY,
          allowedNamespaces: [],
          url: EVEREST_S3_URL,
          region: EVEREST_S3_REGION,
          verifyTLS: true,
          forcePathStyle: false,
        }
      : {
          name: bucket,
          description: 'CI test bucket',
          type: 's3',
          bucketName: bucket,
          secretKey: EVEREST_LOCATION_SECRET_KEY,
          accessKey: EVEREST_LOCATION_ACCESS_KEY,
          allowedNamespaces: [],
          url: EVEREST_LOCATION_URL,
          region: EVEREST_LOCATION_REGION,
          verifyTLS: false,
          forcePathStyle: true,
        };

    promises.push(
      doBackupCall(() =>
        request.post(`/v1/namespaces/${namespace}/backup-storages/`, {
          data,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      )
    );
  });

  // STORAGE_NAMES.forEach(async (storage) => {
  //   promises.push(
  //     doBackupCall(() =>
  //       request.post('/v1/backup-storages/', {
  //         data: {
  //           name: storage,
  //           description: 'CI test bucket',
  //           type: 's3',
  //           bucketName: EVEREST_LOCATION_BUCKET_NAME,
  //           secretKey: EVEREST_LOCATION_SECRET_KEY,
  //           accessKey: EVEREST_LOCATION_ACCESS_KEY,
  //           allowedNamespaces: [namespaces[0]],
  //           url: EVEREST_LOCATION_URL,
  //           region: EVEREST_LOCATION_REGION,
  //           verifyTLS: false,
  //           forcePathStyle: true,
  //         },
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       })
  //     )
  //   );
  // });

  await Promise.all(promises);
});

setup('Monitoring endpoints', async ({ request }) => {
  const token = await getTokenFromLocalStorage();
  const bucketNamespacesMap = getBucketNamespacesMap();
  const allNamespaces = Array.from(
    new Set(bucketNamespacesMap.map(([, namespaces]) => namespaces).flat())
  );
  const promises: Promise<any>[] = [];

  // For the sake of simplicity, we will create a monitoring endpoint for all namespaces in the buckets we defined
  for (const [idx, namespace] of allNamespaces.entries()) {
    promises.push(
      doBackupCall(() =>
        request.post(`/v1/namespaces/${namespace}/monitoring-instances`, {
          data: {
            name: `e2e-endpoint-${idx}`,
            type: 'pmm',
            url: MONITORING_URL,
            allowedNamespaces: [],
            verifyTLS: false,
            pmm: {
              user: MONITORING_USER,
              password: MONITORING_PASSWORD,
            },
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      )
    );
  }
  await Promise.all(promises);
});

setup('Close modal permanently', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('lets-go-button')).toBeVisible();
  await page.getByTestId('lets-go-button').click();
  await page.context().storageState({ path: 'user.json' });
});

setup('Save old RBAC permissions', async ({ request }) => {
  await saveOldRBACPermissions();
});

// setup('Monitoring setup', async ({ request }) => {
//   await createMonitoringInstance(request, testMonitoringName);
//   await createMonitoringInstance(request, testMonitoringName2);
// });
