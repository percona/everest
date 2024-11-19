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
import { expect, Page, test } from '@playwright/test';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import {
  deleteDbCluster,
  findDbAndClickRow,
} from '@e2e/utils/db-clusters-list';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import {
  moveForward,
  populateBasicInformation,
  submitWizard,
} from '@e2e/utils/db-wizard';
import { waitForDelete, waitForStatus } from '@e2e/utils/table';

let token: string;

const openResourcesModal = async (page: Page) => {
  const editResourcesButton = page.getByTestId('edit-resources-button');
  await editResourcesButton.waitFor();
  await editResourcesButton.click();
  expect(page.getByTestId('edit-resources-form-dialog')).toBeVisible();
};

[
  { db: 'psmdb', size: 1 },
  { db: 'pxc', size: 1 },
  // { db: 'postgresql', size: 1 },
].forEach(({ db, size }) => {
  test.describe(`Overview page resources edit for ${db} with ${size} node]`, () => {
    test.describe.configure({ timeout: 900000 });

    const clusterName = `${db}-${size}-resources-edit`;

    let storageClasses = [];

    test.beforeAll(async ({ request }) => {
      token = await getTokenFromLocalStorage();

      const { storageClassNames = [] } = await getClusterDetailedInfo(
        token,
        request
      );
      storageClasses = storageClassNames;
    });

    test(`Creation and waiting of ready ${size} node ${db} ${db == 'psmdb' ? 'with sharding' : ''} for resources edit tests`, async ({
      page,
    }) => {
      expect(storageClasses.length).toBeGreaterThan(0);
      await page.goto('/databases/new');

      await test.step('Populate basic info', async () => {
        await page.getByTestId('toggle-button-group-input-db-type').waitFor();
        await populateBasicInformation(
          page,
          db,
          storageClasses[0],
          clusterName
        );

        // sharding enabling
        if (db == 'psmdb') {
          await page.getByTestId('switch-input-sharding').click();
        }

        // go to resources page
        await moveForward(page);
      });

      await test.step('Populate resources', async () => {
        await page
          .getByRole('button')
          .getByText(size + ' node')
          .click();
        await expect(page.getByText('Nº nodes: ' + size)).toBeVisible();
      });

      await test.step('Move forward form with default values', async () => {
        //go to backups page
        await moveForward(page);
        //go to advanced configuration
        await moveForward(page);
        //go to monitoring
        await moveForward(page);
      });

      await test.step('Submit form', async () => {
        await submitWizard(page);
        await expect(
          page.getByText('Awesome! Your database is being created!')
        ).toBeVisible();
      });

      await test.step('Check db list and status', async () => {
        await page.goto('/databases');
        await waitForStatus(page, clusterName, 'Initializing', 600000);
        await waitForStatus(page, clusterName, 'Up', 600000);
      });
    });

    test(`Show the correct default values during editing of ${db}`, async ({
      page,
    }) => {
      await page.goto('/databases');

      await findDbAndClickRow(page, clusterName);
      await test.step('Open edit resource modal', async () => {
        openResourcesModal(page);
      });

      await test.step('Check default values', async () => {
        //TODO improve setting during creation the CPU, memory, etc.
        //TODO customize sharding number, number of config servers
        await expect(
          page.getByTestId(`toggle-button-nodes-${size}`)
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(
          page.getByTestId('node-resources-toggle-button-small')
        ).toHaveAttribute('aria-pressed', 'true');

        await page.getByTestId('proxies-accordion').click();
        if (db != 'psmdb') {
          await expect(
            page.getByTestId(`toggle-button-proxies-${size}`)
          ).toHaveAttribute('aria-pressed', 'true');
        } else {
          // sharding
          await expect(
            page.getByTestId(`toggle-button-routers-${size}`)
          ).toHaveAttribute('aria-pressed', 'true');
          expect(
            await page.getByTestId('text-input-shard-nr').inputValue()
          ).toBe('2');
          await expect(
            page.getByTestId('shard-config-servers-1')
          ).toHaveAttribute('aria-pressed', 'true');
        }
      });
    });

    test(`Disable disk resize during edition for ${db}`, async ({ page }) => {
      await page.goto('/databases');
      await findDbAndClickRow(page, clusterName);

      await test.step('Open edit resource modal', async () => {
        openResourcesModal(page);
      });
      await expect(page.getByTestId('text-input-disk')).toBeDisabled();
    });

    test('Set custom resources to nodes and proxies during editing', async ({
      page,
    }) => {
      await page.goto('/databases');
      await findDbAndClickRow(page, clusterName);
      await test.step('Open edit resource modal', async () => {
        openResourcesModal(page);
      });

      await test.step('Set custom resources size per node', async () => {
        await expect(
          page.getByTestId('node-resources-toggle-button-custom')
        ).toHaveAttribute('aria-pressed', 'false');
        page.getByTestId('text-input-cpu').fill('2');
        await expect(
          page.getByTestId('node-resources-toggle-button-custom')
        ).toHaveAttribute('aria-pressed', 'true');
      });

      //TODO can be better customizable between different dbTypes
      await page.getByTestId('proxies-accordion').click();
      await test.step(`Set custom number of ${db != 'psmdb' ? 'proxies' : 'routers'}`, async () => {
        await page
          .getByTestId(
            `toggle-button-${db != 'psmdb' ? 'proxies' : 'routers'}-custom`
          )
          .click();
        await page.getByTestId('text-input-custom-nr-of-proxies').fill('2');
      });

      await test.step(`Set custom resources size per ${db != 'psmdb' ? 'proxies' : 'routers'}`, async () => {
        await expect(
          page.getByTestId(
            `${db != 'psmdb' ? 'proxy' : 'router'}-resources-toggle-button-custom`
          )
        ).toHaveAttribute('aria-pressed', 'false');
        page
          .getByTestId('text-input-proxy-cpu')
          .fill(`${db != 'psmdb' ? '0.4' : '2'}`);
        await expect(
          page.getByTestId(
            `${db != 'psmdb' ? 'proxy' : 'router'}-resources-toggle-button-custom`
          )
        ).toHaveAttribute('aria-pressed', 'true');
      });

      expect(page.getByTestId('form-dialog-save')).not.toBeDisabled();
      await page.getByTestId('form-dialog-save').click();

      //check result
      await expect(page.getByTestId(`${clusterName}-status`)).toHaveText(
        'Initializing',
        { timeout: 15000 }
      );
    });

    test(`Delete cluster [${db} size ${size}]`, async ({ page }) => {
      await deleteDbCluster(page, clusterName);
      await waitForStatus(page, clusterName, 'Deleting', 15000);
      await waitForDelete(page, clusterName, 160000);
    });
  });
});
