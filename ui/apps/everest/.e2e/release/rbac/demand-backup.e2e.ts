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
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import {
  giveUserAdminPermissions,
  setRBACPermissionsK8S,
} from '@e2e/utils/rbac-cmd-line';
import { deleteDbClusterFn } from '@e2e/utils/db-cluster';
import { createDbWithParameters } from '@e2e/utils/rbac';
import {
  gotoDbClusterBackups,
  gotoDbClusterRestores,
} from '@e2e/utils/db-clusters-list';

import { waitForStatus } from '@e2e/utils/table';

let token: string;

test.describe.configure({ retries: 0 });

test.describe(
  'Create on-demand backups and list backups',
  {
    tag: '@release',
  },
  () => {
    test.describe.configure({ timeout: 720000 });

    let storageClasses = [];
    const namespace2 = EVEREST_CI_NAMESPACES.EVEREST_UI;
    const namespace1 = EVEREST_CI_NAMESPACES.PXC_ONLY;
    const pxcDb = 'backup-pxc';
    const psmdbDb = 'backup-psmdb';

    test.beforeAll(async ({ request }) => {
      token = await getTokenFromLocalStorage();

      const { storageClassNames = [] } = await getClusterDetailedInfo(
        token,
        request
      );
      storageClasses = storageClassNames;

      await giveUserAdminPermissions();
    });

    test.beforeEach(async ({ page }) => {
      await page.goto('/databases');
    });

    // steps 5,6
    [
      { db: 'pxc', namespace: namespace1, dbName: pxcDb },
      { db: 'psmdb', namespace: namespace2, dbName: psmdbDb },
    ].forEach(({ db, namespace, dbName }) => {
      test(`Create a ${db} db in ${namespace} namespace`, async ({ page }) => {
        expect(storageClasses.length).toBeGreaterThan(0);
        await createDbWithParameters({
          page: page,
          dbType: db,
          dbName: dbName,
          namespace: namespace,
          storageClasses: storageClasses,
        });
      });
    });

    // step 8-9
    [
      { namespace: namespace1, dbName: pxcDb },
      { namespace: namespace2, dbName: psmdbDb },
    ].forEach(({ dbName, namespace }) => {
      test(`User can create and list on-demand backups in ${namespace}`, async ({
        page,
      }) => {
        await setRBACPermissionsK8S([
          ['namespaces', 'read', '*'],
          ['database-clusters', 'read', '*/*'],
          ['database-engines', 'read', '*/*'],
          ['backup-storages', '*', '*/*'],
          ['database-cluster-backups', 'create', '*/*'],
          ['database-cluster-backups', 'read', '*/*'],
        ]);
        const backupName = `${dbName}-backup-1`;
        await gotoDbClusterBackups(page, dbName);

        const createBackupButton = page.getByTestId('menu-button');
        await expect(createBackupButton).toBeVisible();
        await createBackupButton.click();

        const onDemandMenuItem = page.getByTestId('now-menu-item');
        await expect(onDemandMenuItem).toBeVisible();
        await onDemandMenuItem.click();

        await page.getByTestId('text-input-name').fill(backupName);
        await expect(page.getByTestId('text-input-name')).not.toBeEmpty();
        await expect(
          page.getByTestId('text-input-storage-location')
        ).not.toBeEmpty();
        await page.getByTestId('form-dialog-create').click();

        await expect(page.getByText(backupName)).toBeVisible();
        await waitForStatus(page, backupName, 'Succeeded', 300000);
      });
    });

    // step 10-12
    test(`User can only list and create backups of databases in ${namespace2} namespace`, async ({
      page,
    }) => {
      await setRBACPermissionsK8S([
        ['namespaces', 'read', '*'],
        ['database-clusters', 'read', '*/*'],
        ['database-engines', 'read', '*/*'],
        ['backup-storages', '*', '*/*'],
        ['database-cluster-backups', 'create', `${namespace2}/*`],
        ['database-cluster-backups', 'read', `${namespace2}/*`],
      ]);
      await test.step(`User can create and list backups for ${psmdbDb} database in ${namespace2} namespace`, async () => {
        const backupName = `${psmdbDb}-backup-2`;
        await gotoDbClusterBackups(page, psmdbDb);

        const createBackupButton = page.getByTestId('menu-button');
        await expect(createBackupButton).toBeVisible();
        await createBackupButton.click();

        const onDemandMenuItem = page.getByTestId('now-menu-item');
        await expect(onDemandMenuItem).toBeVisible();
        await onDemandMenuItem.click();

        await page.getByTestId('text-input-name').fill(backupName);
        await expect(page.getByTestId('text-input-name')).not.toBeEmpty();
        await expect(
          page.getByTestId('text-input-storage-location')
        ).not.toBeEmpty();
        await page.getByTestId('form-dialog-create').click();

        await expect(page.getByText(backupName)).toBeVisible();
        await expect(page.getByText(`${psmdbDb}-backup-1`)).toBeVisible();
      });

      await test.step(`User cannot create and list backups for ${pxcDb} database in ${namespace1} namespace`, async () => {
        await gotoDbClusterBackups(page, pxcDb);
        await expect(page.getByRole('table')).toBeVisible();

        const createBackupButton = page.getByTestId('menu-button');
        await expect(createBackupButton).not.toBeVisible();

        await expect(page.getByText(`${pxcDb}-backup-1`)).not.toBeVisible();
      });
    });

    // step 13
    test(`User can only list backups of databases in ${namespace2} namespace`, async ({
      page,
    }) => {
      await setRBACPermissionsK8S([
        ['namespaces', 'read', '*'],
        ['database-clusters', 'read', '*/*'],
        ['database-engines', 'read', '*/*'],
        ['backup-storages', '*', '*/*'],
        ['database-cluster-backups', 'read', `${namespace2}/*`],
      ]);
      await test.step(`User can to list backups for ${psmdbDb} database in ${namespace2} namespace`, async () => {
        await gotoDbClusterBackups(page, psmdbDb);
        await expect(page.getByRole('table')).toBeVisible();

        const createBackupButton = page.getByTestId('menu-button');
        await expect(createBackupButton).not.toBeVisible();

        await expect(page.getByText(`${psmdbDb}-backup-1`)).toBeVisible();
      });

      await test.step(`User cannot list backups for ${pxcDb} database in ${namespace1} namespace`, async () => {
        await gotoDbClusterBackups(page, pxcDb);
        await expect(page.getByRole('table')).toBeVisible();

        const createBackupButton = page.getByTestId('menu-button');
        await expect(createBackupButton).not.toBeVisible();

        await expect(page.getByText(`${pxcDb}-backup-1`)).not.toBeVisible();
      });

      await test.step(`User cannot create backups in any namespace`, async () => {
        await gotoDbClusterBackups(page, psmdbDb);
        await expect(page.getByRole('table')).toBeVisible();
        await expect(page.getByTestId('menu-button')).not.toBeVisible();

        await gotoDbClusterBackups(page, pxcDb);
        await expect(page.getByRole('table')).toBeVisible();
        await expect(page.getByTestId('menu-button')).not.toBeVisible();
      });
    });

    [
      { namespace: namespace1, dbName: pxcDb },
      { namespace: namespace2, dbName: psmdbDb },
    ].forEach(({ dbName, namespace }) => {
      test(`User can restore a backup to the same DB in ${namespace}`, async ({
        page,
      }) => {
        await setRBACPermissionsK8S([
          ['namespaces', 'read', '*'],
          ['database-clusters', 'read', '*/*'],
          ['database-clusters', 'update', '*/*'],
          ['database-engines', 'read', '*/*'],
          ['backup-storages', '*', '*/*'],
          ['database-cluster-backups', 'read', '*/*'],
          ['database-cluster-credentials', 'read', '*/*'],
          ['database-cluster-restores', 'read', '*/*'],
          ['database-cluster-restores', 'create', '*/*'],
        ]);
        const backupName = `${dbName}-backup-1`;
        await gotoDbClusterBackups(page, dbName);
        await expect(page.getByText(backupName)).toBeVisible();

        await page
          .locator('.MuiTableRow-root')
          .filter({ hasText: backupName })
          .getByTestId('MoreHorizIcon')
          .click({ timeout: 10000 });

        const restoreOption = page.getByText('Restore to this DB');
        await expect(restoreOption).toBeVisible();
        await restoreOption.click();
        await expect(
          page.getByTestId('select-input-backup-name')
        ).not.toBeEmpty();
        await page.getByTestId('form-dialog-restore').click();
        await waitForStatus(page, dbName, 'Restoring', 30000);
        await waitForStatus(page, dbName, 'Up', 600000);

        await gotoDbClusterRestores(page, dbName);
        await waitForStatus(page, backupName, 'Succeeded', 30000);
      });
    });

    test(`User can only view and create restores in ${namespace2} namespace`, async ({
      page,
    }) => {
      await setRBACPermissionsK8S([
        ['namespaces', 'read', '*'],
        ['database-clusters', 'read', '*/*'],
        ['database-clusters', 'update', '*/*'],
        ['database-engines', 'read', '*/*'],
        ['backup-storages', '*', '*/*'],
        ['database-cluster-backups', 'read', '*/*'],
        ['database-cluster-credentials', 'read', '*/*'],
        ['database-cluster-restores', 'read', `${namespace2}/*`],
        ['database-cluster-restores', 'create', `${namespace2}/*`],
      ]);
      await test.step(`User can restore and list restores for ${psmdbDb} database in ${namespace2} namespace (restriction at restore level)`, async () => {
        await gotoDbClusterBackups(page, psmdbDb);
        const backupName1 = `${psmdbDb}-backup-1`;
        const backupName2 = `${psmdbDb}-backup-2`;

        await page
          .locator('.MuiTableRow-root')
          .filter({ hasText: backupName2 })
          .getByTestId('MoreHorizIcon')
          .click({ timeout: 10000 });

        const restoreOption = page.getByText('Restore to this DB');
        await expect(restoreOption).toBeVisible();
        await restoreOption.click();
        await expect(
          page.getByTestId('select-input-backup-name')
        ).not.toBeEmpty();
        await page.getByTestId('form-dialog-restore').click();
        await waitForStatus(page, psmdbDb, 'Restoring', 30000);
        await waitForStatus(page, psmdbDb, 'Up', 600000);

        await gotoDbClusterRestores(page, psmdbDb);
        await expect(page.getByRole('table')).toBeVisible();
        await page.waitForTimeout(5000);

        await expect(
          page.locator('.MuiTableRow-root').filter({ hasText: backupName2 })
        ).toBeVisible();
        await expect(
          page.locator('.MuiTableRow-root').filter({ hasText: backupName1 })
        ).toBeVisible();
      });
      await test.step(`User cannot restore and list restores for ${pxcDb} database in ${namespace1} namespace`, async () => {
        await gotoDbClusterBackups(page, pxcDb);
        const backupName = `${pxcDb}-backup-1`;

        await expect(
          page
            .locator('.MuiTableRow-root')
            .filter({ hasText: backupName })
            .getByTestId('MoreHorizIcon')
        ).not.toBeVisible();

        await gotoDbClusterRestores(page, pxcDb);
        await expect(page.getByRole('table')).toBeVisible();
        await page.waitForTimeout(5000);

        expect(await page.getByText('No restores')).toBeVisible();
      });
    });

    test('Delete databases', async ({ page, request }) => {
      await setRBACPermissionsK8S([
        ['namespaces', 'read', '*'],
        ['database-clusters', '*', '*/*'],
        ['database-engines', '*', '*/*'],
        ['backup-storages', '*', '*/*'],
        ['database-cluster-backups', '*', '*/*'],
        ['monitoring-instances', '*', '*/*'],
      ]);
      await deleteDbClusterFn(request, pxcDb, namespace1);
      await deleteDbClusterFn(request, psmdbDb, namespace2);

      await expect(page.getByText(pxcDb)).not.toBeVisible({ timeout: 70000 });
      await expect(page.getByText(psmdbDb)).not.toBeVisible({ timeout: 70000 });
    });
  }
);
