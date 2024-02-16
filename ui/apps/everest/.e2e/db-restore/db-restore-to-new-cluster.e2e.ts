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
import { Messages } from '../../src/modals/restore-db-modal/restore-db-modal.messages';
import { createDbClusterFn, deleteDbClusterFn } from '../utils/db-cluster';
import {
  findDbAndClickActions,
  findDbAndClickRow,
} from '../utils/db-clusters-list';
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { getNamespacesFn } from '../utils/namespaces';

test.describe('DB Cluster Restore to the new cluster', () => {
  const dbClusterName = 'mysql-restore-to-new';
  let namespace = '';

  test.beforeEach(async ({ request, page }) => {
    await page.goto('/databases');
    const token = await getTokenFromLocalStorage();
    const namespaces = await getNamespacesFn(token, request);
    namespace = namespaces[0];
    await createDbClusterFn(token, request, namespaces[0], {
      dbName: dbClusterName,
      dbType: 'mysql',
      numberOfNodes: '1',
      backup: {
        enabled: true,
        schedules: [],
      },
    });
  });

  test.afterEach(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    await deleteDbClusterFn(token, request, dbClusterName, namespace);
  });

  test('DB cluster list restore action', async ({ page }) => {
    await findDbAndClickActions(page, dbClusterName, 'Create DB from a backup');

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

    const restoreButton = page.getByTestId(
      `${dbClusterName}-create-new-db-from-backup`
    );
    await restoreButton.click();

    await expect(
      page
        .getByTestId('select-backup-name-button')
        .getByText(Messages.selectBackup)
    ).toBeVisible();
  });
});
