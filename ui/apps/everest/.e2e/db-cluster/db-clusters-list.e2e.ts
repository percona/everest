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

import { test } from '@playwright/test';
import { createDbClusterFn } from '../utils/db-cluster';
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { getNamespacesFn } from '../utils/namespaces';

test.describe('DB Cluster List', () => {
  const mySQLName = 'mysql-test-ui';

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
  });

  test('DB clusters Delete Action', async ({ page, request }) => {
    const token = await getTokenFromLocalStorage();
    const namespaces = await getNamespacesFn(token, request);

    await createDbClusterFn(token, request, namespaces[0], {
      dbName: mySQLName,
      dbType: 'mysql',
      numberOfNodes: '1',
    });

    await page
      .getByTestId(`${mySQLName}-status`)
      .filter({ hasText: 'Initializing' });

    const button = await page
      .getByRole('row')
      .filter({ hasText: mySQLName })
      .getByLabel('Row Actions');
    await button.click();

    // Delete action
    const deleteButton = page.getByTestId(`${mySQLName}-delete`);
    await deleteButton.click();
    await page.getByTestId(`${mySQLName}-confirm-dialog`).waitFor();
    const deleteConfirmationButton = await page
      .getByRole('button')
      .filter({ hasText: 'Delete' });
    await deleteConfirmationButton.click();
  });

  test.skip('DB cluster Paused/Resume', async () => {
    // TODO check update of Paused/Resume Status
  });

  test.skip('DB cluster Restarting', async () => {
    // TODO check updating of status
  });
});
