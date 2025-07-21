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
import {
  moveForward,
  submitWizard,
  populateBasicInformation,
  populateResources,
  populateAdvancedConfig,
} from '@e2e/utils/db-wizard';
import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import { waitForStatus, waitForDelete } from '@e2e/utils/table';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';

let token: string;

[
  { db: 'psmdb', size: 3 },
  { db: 'pxc', size: 3 },
  { db: 'postgresql', size: 3 },
].forEach(({ db, size }) => {
  test.describe(`DB Table View [${db} size ${size}]`, () => {
    const clusterName = `${db}-${size}-table-view`;
    const namespace = EVEREST_CI_NAMESPACES.EVEREST_UI;
    let storageClasses: string[] = [];

    test.beforeAll(async ({ request }) => {
      token = await getTokenFromLocalStorage();
      const { storageClassNames = [] } = await getClusterDetailedInfo(
        token,
        request
      );
      storageClasses = storageClassNames;
    });

    test(`Create DB cluster [${db} size ${size}]`, async ({ page }) => {
      expect(storageClasses.length).toBeGreaterThan(0);

      await page.goto('/databases');
      await page.getByTestId('add-db-cluster-button').waitFor();
      await page.getByTestId('add-db-cluster-button').click();
      await page.getByTestId(`add-db-cluster-button-${db}`).click();

      await test.step('Populate basic information', async () => {
        await populateBasicInformation(
          page,
          namespace,
          clusterName,
          db,
          storageClasses[0],
          false,
          null
        );
        await moveForward(page);
      });

      await test.step('Populate resources', async () => {
        await page.getByRole('button').getByText('3 node').click();
        await expect(page.getByText('Nodes (3)')).toBeVisible();
        await populateResources(page, 0.6, 1, 1, 3);
        await moveForward(page);
      });

      await test.step('Populate backups', async () => {
        await moveForward(page);
      });

      await test.step('Populate advanced db config', async () => {
        await populateAdvancedConfig(page, db, false, '', true, '');
        await moveForward(page);
      });

      await test.step('Submit wizard', async () => {
        await submitWizard(page);
      });

      await test.step('Wait for cluster to be Up', async () => {
        await page.goto('/databases');
        await waitForStatus(page, clusterName, 'Initializing', 30000);
        await waitForStatus(page, clusterName, 'Up', 600000);
      });
    });

    test('Table view displays the created cluster', async ({ page }) => {
      await page.goto('/databases');
      const row = page.getByTestId(`db-cluster-${clusterName}`);
      await expect(row).toBeVisible();
      await expect(row).toContainText(clusterName);
      await expect(row).toContainText('Up');
      await expect(row).toContainText('3'); // Node count
      // Add more assertions for table columns if needed
    });

    test(`Delete cluster [${db} size ${size}]`, async ({ page }) => {
      await page.goto('/databases');
      await page.getByTestId(`delete-db-cluster-button-${clusterName}`).click();
      await page.getByTestId('confirm-delete-db-cluster').click();
      await waitForStatus(page, clusterName, 'Deleting', 15000);
      await waitForDelete(page, clusterName, 240000);
    });
  });
});

test('Switch between table view and diagram view', async ({ page }) => {
  await page.goto('/databases/components');

  const tableViewSwitch = page
    .getByTestId('switch-input-table-view')
    .getByRole('checkbox');
  if (await tableViewSwitch.isChecked()) {
    await expect(page.getByTestId('components-table-view')).toBeVisible();
  } else {
    await expect(page.getByTestId('components-diagram-view')).toBeVisible();
  }
});
