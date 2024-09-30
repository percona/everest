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
import { createDbClusterFn } from 'utils/db-cluster';
import { findDbAndClickActions } from 'utils/db-clusters-list';

test.describe('DB Cluster List', () => {
  const mySQLName = 'mysql-test-ui';

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
  });

  test('DB clusters Delete Action', async ({ page, request }) => {
    await createDbClusterFn(request, {
      dbName: mySQLName,
      dbType: 'mysql',
      numberOfNodes: '1',
    });

    await findDbAndClickActions(page, mySQLName, 'Delete');

    // Delete action
    await page.getByTestId(`${mySQLName}-form-dialog`).waitFor();
    await expect(page.getByTestId('irreversible-action-alert')).toBeVisible();
    const deleteConfirmationButton = page
      .getByRole('button')
      .filter({ hasText: 'Delete' });
    await expect(deleteConfirmationButton).toBeDisabled();
    await page.getByTestId('text-input-confirm-input').fill(mySQLName);
    await expect(deleteConfirmationButton).toBeEnabled();
    await deleteConfirmationButton.click();
  });

  test.skip('DB cluster Paused/Resume', async () => {
    // TODO check update of Paused/Resume Status
  });

  test.skip('DB cluster Restarting', async () => {
    // TODO check updating of status
  });
});
