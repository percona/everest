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

import { test as setup } from '@playwright/test';
import 'dotenv/config';
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { doBackupCall } from '../utils/request';
import { getBucketNamespacesMap } from '../constants';

const {
  EVEREST_LOCATION_ACCESS_KEY,
  EVEREST_LOCATION_SECRET_KEY,
  EVEREST_LOCATION_REGION,
  EVEREST_LOCATION_URL,
  EVEREST_S3_ACCESS_KEY,
  EVEREST_S3_SECRET_KEY,
  EVEREST_S3_REGION,
  EVEREST_S3_URL,
} = process.env;

setup.describe.serial('Backup Storage setup', () => {
  setup('Create Backup storages', async ({ request }) => {
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
    await Promise.all(promises);
  });
});
