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
  deleteDbCluster,
  gotoDbClusterBackups,
  gotoDbClusterRestores,
} from '@e2e/utils/db-clusters-list';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import {
  moveForward,
  submitWizard,
  populateBasicInformation,
  populateResources,
  populateAdvancedConfig,
} from '@e2e/utils/db-wizard';
import { EVEREST_CI_NAMESPACES, technologyMap } from '@e2e/constants';
import {
  waitForStatus,
  waitForDelete,
  findRowAndClickActions,
} from '@e2e/utils/table';
import { clickOnDemandBackup } from '@e2e/pr/db-cluster-details/utils';
import { prepareTestDB, dropTestDB, queryTestDB, insertTestDB } from '@e2e/utils/db-cmd-line';
import { getDbClusterAPI, getDbNextLatestMajorVersion } from '@e2e/utils/db-cluster';
import { findDbAndClickRow } from '@e2e/utils/db-clusters-list';
import { shouldExecuteDBCombination } from '@e2e/utils/generic';
import { request } from 'http';

let token: string;

const DBVersions = {
  psmdb: ["6.0", "7.0", "8.0"],
};

test.describe.configure({ retries: 0 });

[
  { db: 'psmdb', size: 3 },
].forEach(({ db, size }) => {
  test.describe(
    'Database major upgrade',
    {
      tag: '@release',
    },
    () => {
      test.skip(!shouldExecuteDBCombination(db, size));
      test.describe.configure({ timeout: 720000 });

      const clusterName = `${db}-${size}-upgrade`;

      let storageClasses = [];
      const namespace = EVEREST_CI_NAMESPACES.EVEREST_UI;
      const monitoringName = 'e2e-endpoint-0';
      const baseBackupName = `upgrade-${db}-${size}`;

      test.beforeAll(async ({ request }) => {
        token = await getTokenFromLocalStorage();

        const { storageClassNames = [] } = await getClusterDetailedInfo(
          token,
          request
        );
        storageClasses = storageClassNames;
      });

      test(`Cluster creation [${db} size ${size}]`, async ({
        page,
        request,
      }) => {
        expect(storageClasses.length).toBeGreaterThan(0);

        await page.goto('/databases');
        await page.getByTestId('add-db-cluster-button').waitFor();
        await page.getByTestId('add-db-cluster-button').click();
        await page.getByTestId(`add-db-cluster-button-${db}`).click();

        const dbVersion = await getDbNextLatestMajorVersion(db, namespace, DBVersions[db][0], request);
        await test.step('Populate basic information', async () => {
          await populateBasicInformation(
            page,
            namespace,
            clusterName,
            db,
            storageClasses[0],
            false,
            dbVersion
          );
          await moveForward(page);
        });

        await test.step('Populate resources', async () => {
          await page
            .getByRole('button')
            .getByText(size + ' node')
            .click();
          await expect(page.getByText('Nodes (' + size + ')')).toBeVisible();
          await populateResources(page, 0.6, 1, 1, size);
          await moveForward(page);
        });

        await test.step('Populate backups', async () => {
          await moveForward(page);
        });

        await test.step('Populate advanced db config', async () => {
          await populateAdvancedConfig(page, db, '', true, '');
          await moveForward(page);
        });

        // await test.step('Populate monitoring', async () => {
        //   await page.getByTestId('switch-input-monitoring').click();
        //   await page
        //     .getByTestId('text-input-monitoring-instance')
        //     .fill(monitoringName);
        //   await expect(
        //     page.getByTestId('text-input-monitoring-instance')
        //   ).toHaveValue(monitoringName);
        // });

        await test.step('Submit wizard', async () => {
          await submitWizard(page);
        });

        // go to db list and check status
        await test.step('Check db list and status', async () => {
          await page.goto('/databases');
          await waitForStatus(page, clusterName, 'Initializing', 15000);
          await waitForStatus(page, clusterName, 'Up', 600000);
        });

        await test.step('Check db cluster k8s object options', async () => {
          const addedCluster = await getDbClusterAPI(
            clusterName,
            EVEREST_CI_NAMESPACES.EVEREST_UI,
            request,
            token
          );

          expect(addedCluster?.spec.engine.type).toBe(db);
          expect(addedCluster?.spec.engine.replicas).toBe(size);
          expect(['600m', '0.6']).toContain(
            addedCluster?.spec.engine.resources?.cpu.toString()
          );
          expect(addedCluster?.spec.engine.resources?.memory.toString()).toBe(
            '1G'
          );
          expect(addedCluster?.spec.engine.storage.size.toString()).toBe('1Gi');
          expect(addedCluster?.spec.proxy.expose.type).toBe('internal');
          if (db != 'psmdb') {
            expect(addedCluster?.spec.proxy.replicas).toBe(size);
          }
        });
      });

      test(`Add data [${db} size ${size}]`, async () => {
        await prepareTestDB(clusterName, namespace);
      });

      test(`Create demand backup [${db} size ${size}]`, async ({ page }) => {
        await gotoDbClusterBackups(page, clusterName);
        await clickOnDemandBackup(page);
        await page.getByTestId('text-input-name').fill(baseBackupName + '-1');
        await expect(page.getByTestId('text-input-name')).not.toBeEmpty();
        await expect(
          page.getByTestId('text-input-storage-location')
        ).not.toBeEmpty();
        await page.getByTestId('form-dialog-create').click();

        await waitForStatus(page, baseBackupName + '-1', 'Succeeded', 300000);
      });

      test(`Run major upgrades [${db} size ${size}]`, async ({ page, request }) => {
        let i = 0;
        let expectedResult: string[] = ['1', '2', '3'];

        for (const dbVersion of DBVersions[db]) {
          if (i !== 0) { // we skip first element because it's just used for initial installation
            expectedResult.push(`${i}+3`);

            await test.step(`Upgrade to ${dbVersion}`, async () => {
              const nextMajorVersion = await getDbNextLatestMajorVersion(db, namespace, dbVersion, request);
              await page.goto('/databases');
              await findDbAndClickRow(page, clusterName);
              await page.getByTestId('upgrade-db-btn').click();
              await expect(page.getByText('Upgrade DB version')).toBeVisible();
              await expect(page.getByTestId('form-dialog-upgrade')).toBeDisabled();
              await page.getByRole('combobox').click();
              await page.getByRole('option', { name: `${nextMajorVersion}` }).click();
              await expect(page.getByTestId('form-dialog-cancel')).toBeEnabled();
              await page.getByTestId('form-dialog-upgrade').click();
              await page.goto('/databases');
              await waitForStatus(page, clusterName, 'Upgrading', 15000);
              await waitForStatus(page, clusterName, 'Up', 300000);
              const technology = technologyMap[db] || "Unknown";
              await expect(page.getByText(`${technology} ${nextMajorVersion}`)).toBeVisible();
              await findDbAndClickRow(page, clusterName);
              await expect(page.getByTestId('upgrade-db-btn')).not.toBeVisible();
            });

            await test.step('Insert more data after upgrade', async () => {
              await insertTestDB(
                clusterName,
                namespace,
                [`${i}+3`],
                expectedResult
              );
            });

            await test.step(`Create demand backup after upgrade`, async () => {
              await gotoDbClusterBackups(page, clusterName);
              await clickOnDemandBackup(page);
              await page.getByTestId('text-input-name').fill(baseBackupName + `${i}+1`);
              await expect(page.getByTestId('text-input-name')).not.toBeEmpty();
              await expect(
                page.getByTestId('text-input-storage-location')
              ).not.toBeEmpty();
              await page.getByTestId('form-dialog-create').click();

              await waitForStatus(page, baseBackupName + `${i}+1`, 'Succeeded', 300000);
            });
          }
          i++;
        }
      });

      test(`Delete all backups [${db} size ${size}]`, async ({ page }) => {
        for (let i = 1; i <= DBVersions[db].length; i++) {
          // PG doesn't list first backup after second restore
          if (db !== 'postgresql' && i !== 1) {
            await gotoDbClusterBackups(page, clusterName);
            await findRowAndClickActions(
              page,
              baseBackupName + `-${i}`,
              'Delete'
            );
            await expect(page.getByLabel('Delete backup')).toBeVisible();
            await page.getByTestId('form-dialog-delete').click();
            await waitForDelete(page, baseBackupName + `-${i}`, 30000);
          }
        }
      });

      test(`Delete cluster [${db} size ${size}]`, async ({ page }) => {
        await deleteDbCluster(page, clusterName);
        await waitForStatus(page, clusterName, 'Deleting', 15000);
        await waitForDelete(page, clusterName, 240000);
      });
    }
  );
});
