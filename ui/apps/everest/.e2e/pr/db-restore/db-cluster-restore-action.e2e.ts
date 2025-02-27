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

import { expect, test } from '@playwright/test';
import { Messages } from '../../../src/modals/restore-db-modal/restore-db-modal.messages';
import { createDbClusterFn, deleteDbClusterFn } from '@e2e/utils/db-cluster';
import {
  findDbAndClickActions,
  findDbAndClickRow,
} from '@e2e/utils/db-clusters-list';
import { getBucketNamespacesMap } from '@e2e/constants';

const dbClusterName = 'restore-db';

test.describe('DB Cluster Restore', () => {
  test.beforeAll(async ({ request }) => {
    await createDbClusterFn(request, {
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
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
  });

  test.afterAll(async ({ request }) => {
    await deleteDbClusterFn(request, dbClusterName);
  });

  test('DB cluster list restore action', async ({ page }) => {
    await findDbAndClickActions(page, dbClusterName, 'Restore from a backup');
    await expect(
      page
        .getByTestId('select-backup-name-button')
        .getByText(Messages.selectBackup)
    ).toBeVisible();
  });

  test('DB cluster detail restore action', async ({ page }) => {
    await findDbAndClickRow(page, dbClusterName);
    const actionButton = page.getByTestId('actions-button');
    await actionButton.click();

    const restoreButton = page.getByTestId(`${dbClusterName}-restore`);
    await restoreButton.click();
    await expect(
      page
        .getByTestId('select-backup-name-button')
        .getByText(Messages.selectBackup)
    ).toBeVisible();
  });

  test('keep selected time in the modal', async ({
    page,
    request,
  }, testInfo) => {
    testInfo.setTimeout(30000);
    await page.route(
      '/v1/namespaces/**/database-clusters/**/pitr',
      async (route) => {
        await route.fulfill({
          json: {
            earliestDate: '2025-02-27T12:45:00Z',
            latestDate: '2025-02-27T15:30:00.00Z',
            gaps: false,
            latestBackupName: 'cron-mongodb-0b8-20250227124400-t7zjb',
          },
        });
      }
    );
    await page.route(
      '/v1/namespaces/**/database-clusters/**/backups',
      async (route) => {
        await route.fulfill({
          json: {
            items: [
              {
                metadata: {
                  name: 'cron-mongodb',
                },
                spec: {
                  backupStorageName: 'minio',
                  dbClusterName: 'mongodb-0b8',
                },
                status: {
                  completed: '2025-02-27T15:30:00.00Z',
                  created: '2025-02-27T12:45:00Z',
                  gaps: false,
                  latestRestorableTime: '2025-02-27T11:44:22Z',
                  state: 'Succeeded',
                },
              },
            ],
          },
        });
      }
    );

    await findDbAndClickRow(page, dbClusterName);
    await page.getByTestId('actions-button').click();
    await page.getByTestId(`${dbClusterName}-restore`).click();
    await page.getByTestId('radio-option-fromPITR').click();
    const input = await page.getByTestId('date-time-picker-pitr-backup');
    expect(await input.inputValue()).toBe('27/02/2025 at 15:30:00');
    await input.fill('27/02/2025 at 15:25:00');
    // Wait for some time to make sure the input value hasn't changed
    await page.waitForTimeout(12000);
    expect(await input.inputValue()).toBe('27/02/2025 at 15:25:00');
  });
});
