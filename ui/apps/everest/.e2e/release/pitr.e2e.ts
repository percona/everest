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
  findDbAndClickActions,
} from '@e2e/utils/db-clusters-list';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import {
  moveForward,
  submitWizard,
  populateBasicInformation,
  populateResources,
  populateAdvancedConfig,
  populateMonitoringModalForm,
} from '@e2e/utils/db-wizard';
import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import {
  waitForStatus,
  waitForDelete,
  findRowAndClickActions,
} from '@e2e/utils/table';
import { checkError } from '@e2e/utils/generic';
import {
  deleteMonitoringInstance,
  listMonitoringInstances,
} from '@e2e/utils/monitoring-instance';
import { clickOnDemandBackup } from '@e2e/pr/db-cluster-details/utils';
import {
  prepareTestDB,
  dropTestDB,
  queryTestDB,
  insertMoreTestDB,
  pgInsertDummyTestDB,
} from '@e2e/utils/db-cmd-line';
import { addFirstScheduleInDBWizard } from '@e2e/pr/db-cluster/db-wizard/db-wizard-utils';

const {
  MONITORING_URL,
  MONITORING_USER,
  MONITORING_PASSWORD,
  SELECT_DB,
  SELECT_SIZE,
} = process.env;

type pitrTime = {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  second: string;
  ampm: string;
};

let token: string;
let pitrRestoreTime: pitrTime = {
  day: '',
  month: '',
  year: '',
  hour: '',
  minute: '',
  second: '',
  ampm: '',
};

function getCurrentPITRTime(): pitrTime {
  const time = {} as pitrTime;
  const now: Date = new Date();

  // Get date parts
  time.day = now.getDate().toString();
  time.month = (now.getMonth() + 1).toString(); // Months are zero-indexed, so add 1
  time.year = now.getFullYear().toString();

  // Get time parts
  let hour: number = now.getHours();
  time.minute = now.getMinutes().toString();
  time.second = now.getSeconds().toString();

  // Determine AM or PM
  time.ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12; // Convert 24-hour format to 12-hour format, making 0 => 12
  time.hour = hour.toString();

  return time;
}

function getFormattedPITRTime(time: pitrTime): string {
  const formattedDateTime: string = `${time.day.padStart(2, '0')}/${time.month.padStart(2, '0')}/${time.year} at ${time.hour.padStart(2, '0')}:${time.minute.padStart(2, '0')}:${time.second.padStart(2, '0')} ${time.ampm}`;

  return formattedDateTime;
}

test.describe.configure({ retries: 0 });

[
  { db: 'psmdb', size: 3 },
  { db: 'pxc', size: 3 },
  { db: 'postgresql', size: 3 },
].forEach(({ db, size }) => {
  test.describe(
    'PITR',
    {
      tag: '@release',
    },
    () => {
      test.skip(
        () =>
          (SELECT_DB !== db && !!SELECT_DB) ||
          (SELECT_SIZE !== size.toString() && !!SELECT_SIZE)
      );
      test.describe.configure({ timeout: 720000 });

      const clusterName = `${db}-${size}-pitr`;

      let storageClasses = [];
      const namespace = EVEREST_CI_NAMESPACES.EVEREST_UI;
      const monitoringName = `${db}-${size}-pmm`;
      const baseBackupName = `dembkp-${db}-${size}`;

      test.beforeAll(async ({ request }) => {
        token = await getTokenFromLocalStorage();

        const { storageClassNames = [] } = await getClusterDetailedInfo(
          token,
          request
        );
        storageClasses = storageClassNames;
      });

      test.afterAll(async ({ request }) => {
        // we try to delete all monitoring instances because cluster creation expects that none exist
        // (monitoring instance is added in the form where the warning that none exist is visible)
        const monitoringInstances = await listMonitoringInstances(
          request,
          namespace,
          token
        );
        for (const instance of monitoringInstances) {
          await deleteMonitoringInstance(
            request,
            namespace,
            instance.name,
            token
          );
        }
      });

      test(`Cluster creation [${db} size ${size}]`, async ({
        page,
        request,
      }) => {
        expect(storageClasses.length).toBeGreaterThan(0);

        await page.goto('/databases/new');
        await page.getByTestId('toggle-button-group-input-db-type').waitFor();
        await page.getByTestId('select-input-db-version').waitFor();

        await test.step('Populate basic information', async () => {
          await populateBasicInformation(
            page,
            db,
            storageClasses[0],
            clusterName
          );
          await moveForward(page);
        });

        await test.step('Populate resources', async () => {
          await page
            .getByRole('button')
            .getByText(size + ' node')
            .click();
          await expect(page.getByText('Nº nodes: ' + size)).toBeVisible();
          await populateResources(page, 0.6, 1, 1, size);
          await moveForward(page);
        });

        await test.step('Populate backups, enable PITR', async () => {
          await addFirstScheduleInDBWizard(page);
          const pitrCheckbox = page
            .getByTestId('switch-input-pitr-enabled')
            .getByRole('checkbox');

          if (db !== 'postgresql') {
            await expect(pitrCheckbox).not.toBeChecked();
            await pitrCheckbox.setChecked(true);

            if (db === 'pxc') {
              const pitrStorageLocation = page.getByTestId(
                'text-input-pitr-storage-location'
              );
              await expect(pitrStorageLocation).toBeVisible();
              await expect(pitrStorageLocation).not.toBeEmpty();
            } else {
              await expect(page.getByText('Storage: bucket-1')).toHaveCount(2);
            }
          }

          await expect(pitrCheckbox).toBeChecked();
          await moveForward(page);
        });

        await test.step('Populate advanced db config', async () => {
          await populateAdvancedConfig(page, db, '', true, '');
          await moveForward(page);
        });

        await test.step('Populate monitoring', async () => {
          await populateMonitoringModalForm(
            page,
            monitoringName,
            namespace,
            MONITORING_URL,
            MONITORING_USER,
            MONITORING_PASSWORD
          );
          await page.getByTestId('switch-input-monitoring').click();
          await expect(
            page.getByTestId('text-input-monitoring-instance')
          ).toHaveValue(monitoringName);
        });

        await test.step('Submit wizard', async () => {
          await submitWizard(page);

          await expect(
            page.getByText('Awesome! Your database is being created!')
          ).toBeVisible();
        });

        await test.step('Check db list and status', async () => {
          await page.goto('/databases');
          await waitForStatus(page, clusterName, 'Initializing', 15000);
          await waitForStatus(page, clusterName, 'Up', 660000);
        });

        await test.step('Update PSMDB cluster PITR uploadIntervalSec', async () => {
          if (db !== 'psmdb') {
            return;
          }
          let psmdbCluster = await request.get(
            `/v1/namespaces/${namespace}/database-clusters/${clusterName}`
          );

          await checkError(psmdbCluster);
          const psmdbPayload = await psmdbCluster.json();

          psmdbPayload.spec.backup.pitr.uploadIntervalSec = 60;

          const updatedPSMDBCluster = await request.put(
            `/v1/namespaces/${namespace}/database-clusters/${clusterName}`,
            {
              data: psmdbPayload,
            }
          );

          await checkError(updatedPSMDBCluster);
        });

        await test.step('Check db cluster k8s object options', async () => {
          const response = await request.get(
            `/v1/namespaces/${namespace}/database-clusters`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          await checkError(response);

          // TODO: replace with correct payload typings from GET DB Clusters
          const { items: clusters } = await response.json();

          const addedCluster = clusters.find(
            (cluster) => cluster.metadata.name === clusterName
          );

          expect(addedCluster?.spec.backup.pitr.enabled).toBe(true);
          expect(addedCluster).not.toBeUndefined();
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

        await waitForStatus(page, baseBackupName + '-1', 'Succeeded', 240000);
      });

      test(`Add more data [${db} size ${size}]`, async () => {
        await insertMoreTestDB(clusterName, namespace);
        pitrRestoreTime = getCurrentPITRTime();

        // for PG we need one more transaction to be able to restore to the previous one
        if (db == 'postgresql') {
          pgInsertDummyTestDB(clusterName, namespace);
        }
      });

      test(`Wait 1 min for binlogs to be uploaded [${db} size ${size}]`, async () => {
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        await delay(65000);
      });

      test(`Delete data [${db} size ${size}]`, async () => {
        await dropTestDB(clusterName, namespace);
      });

      test(`Restore cluster [${db} size ${size}]`, async ({ page }) => {
        await page.goto('databases');
        await findDbAndClickActions(page, clusterName, 'Restore from a backup');
        await page
          .getByTestId('radio-option-fromPITR')
          .click({ timeout: 5000 });
        await expect(page.getByTestId('radio-option-fromPITR')).toBeChecked({
          timeout: 5000,
        });
        await expect(
          page.getByPlaceholder('DD/MM/YYYY at hh:mm:ss aa')
        ).toBeVisible({ timeout: 5000 });
        await expect(
          page.getByPlaceholder('DD/MM/YYYY at hh:mm:ss aa')
        ).not.toBeEmpty({ timeout: 5000 });
        await page.getByTestId('CalendarIcon').click({ timeout: 5000 });
        await page
          .getByLabel(pitrRestoreTime.hour + ' hours', { exact: true })
          .click({ timeout: 5000 });
        await page
          .getByLabel(pitrRestoreTime.minute + ' minutes', { exact: true })
          .click({ timeout: 5000 });
        await page
          .getByLabel(pitrRestoreTime.second + ' seconds', { exact: true })
          .click({ timeout: 5000 });
        await page
          .getByLabel(pitrRestoreTime.ampm, { exact: true })
          .click({ timeout: 5000 });
        await expect(
          page.getByPlaceholder('DD/MM/YYYY at hh:mm:ss aa')
        ).toHaveValue(getFormattedPITRTime(pitrRestoreTime));

        await page.getByTestId('form-dialog-restore').click({ timeout: 5000 });

        await page.goto('/databases');
        await waitForStatus(page, clusterName, 'Restoring', 30000);
        await waitForStatus(page, clusterName, 'Up', 600000);

        await gotoDbClusterRestores(page, clusterName);
        await waitForStatus(page, 'restore-', 'Succeeded', 120000);
      });

      test(`Check data after restore [${db} size ${size}]`, async () => {
        const result = await queryTestDB(clusterName, namespace);
        switch (db) {
          case 'pxc':
            expect(result.trim()).toBe('1\n2\n3\n4\n5\n6');
            break;
          case 'psmdb':
            expect(result.trim()).toBe(
              '[ { a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }, { a: 6 } ]'
            );
            break;
          case 'postgresql':
            expect(result.trim()).toBe('1\n 2\n 3\n 4\n 5\n 6');
            break;
        }
      });

      test(`Delete restore [${db} size ${size}]`, async ({ page }) => {
        await gotoDbClusterRestores(page, clusterName);
        await findRowAndClickActions(page, baseBackupName + '-1', 'Delete');
        await expect(page.getByLabel('Delete restore')).toBeVisible();
        await page.getByTestId('confirm-dialog-delete').click();
        await waitForDelete(page, baseBackupName + '-1', 15000);
      });

      test(`Delete backup [${db} size ${size}]`, async ({ page }) => {
        await gotoDbClusterBackups(page, clusterName);
        await findRowAndClickActions(page, baseBackupName + '-1', 'Delete');
        await expect(page.getByLabel('Delete backup')).toBeVisible();
        await page.getByTestId('form-dialog-delete').click();
        await waitForDelete(page, baseBackupName + '-1', 30000);
      });

      test(`Delete cluster [${db} size ${size}]`, async ({ page }) => {
        await deleteDbCluster(page, clusterName);
        await waitForStatus(page, clusterName, 'Deleting', 15000);
        await waitForDelete(page, clusterName, 160000);
      });
    }
  );
});
