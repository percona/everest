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
import { createDbClusterFn } from '@e2e/utils/db-cluster';
import { EVEREST_CI_NAMESPACES, getBucketNamespacesMap } from '@e2e/constants';
import { dbClusterName } from './project.config';

setup.describe.serial('DB Cluster Restore setup', () => {
  setup(`Create ${dbClusterName} cluster`, async ({ request }) => {
    await createDbClusterFn(
      request,
      {
        dbName: dbClusterName,
        dbType: 'mysql',
        numberOfNodes: '1',
        backup: {
          enabled: true,
          schedules: [
            {
              backupStorageName: getBucketNamespacesMap()[0][0],
              enabled: true,
              name: 'backup-1',
              schedule: '0 * * * *',
            },
          ],
        },
      },
      EVEREST_CI_NAMESPACES.EVEREST_UI
    );
  });
});
