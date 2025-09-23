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
import { getCITokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import {
  giveUserAdminPermissions,
  setRBACPermissionsK8S,
} from '@e2e/utils/rbac-cmd-line';
import { deleteDbClusterFn } from '@e2e/utils/db-cluster';
import { createDbWithParameters } from '@e2e/utils/rbac';

let token: string;

test.describe.configure({ retries: 0 });

test.describe(
  'DB Clusters List',
  {
    tag: '@release',
  },
  () => {
    test.describe.configure({ timeout: 720000 });
    let storageClasses = [];
    const namespace2 = EVEREST_CI_NAMESPACES.EVEREST_UI;
    const namespace1 = EVEREST_CI_NAMESPACES.PXC_ONLY;
    const pxcDb = 'list-pxc';
    const psmdbDb = 'list-psmdb';
    const pgDb = 'list-pg-test';

    test.beforeAll(async ({ request }) => {
      token = await getCITokenFromLocalStorage();

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

    test(`Create a mysql db with schedules and monitoring`, async ({
      page,
    }) => {
      await createDbWithParameters({
        page: page,
        dbType: 'pxc',
        dbName: pxcDb,
        namespace: namespace1,
        storageClasses: storageClasses,
        addBackupSchedule: true,
        addMonitoring: true,
      });
    });

    test(`Create a mongo db without schedules and monitoring`, async ({
      page,
    }) => {
      await createDbWithParameters({
        page: page,
        dbType: 'psmdb',
        dbName: psmdbDb,
        namespace: namespace2,
        storageClasses: storageClasses,
      });
    });

    test(`Create a pg db with schedules and monitoring`, async ({ page }) => {
      await createDbWithParameters({
        page: page,
        dbType: 'postgresql',
        dbName: pgDb,
        namespace: namespace2,
        storageClasses: storageClasses,
        addBackupSchedule: true,
        addMonitoring: true,
      });
    });

    test(`The user can list databases in all namespaces without backup schedules and monitoring `, async ({
      page,
    }) => {
      await expect(page.getByRole('table')).toBeVisible();

      await expect(page.getByText(pxcDb)).toBeVisible();
      await expect(page.getByText(psmdbDb)).toBeVisible();
      await expect(page.getByText(pgDb)).toBeVisible();

      await setRBACPermissionsK8S([
        ['namespaces', 'read', '*'],
        ['database-clusters', 'read', '*/*'],
        ['database-engines', 'read', '*/*'],
      ]);

      await expect(page.getByRole('table')).toBeVisible();

      await expect(page.getByText(pxcDb)).not.toBeVisible();
      await expect(page.getByText(psmdbDb)).toBeVisible();
      await expect(page.getByText(pgDb)).not.toBeVisible();
    });

    test(`The user can list databases in all namespaces with backup schedules and monitoring `, async ({
      page,
    }) => {
      await setRBACPermissionsK8S([
        ['namespaces', 'read', '*'],
        ['database-clusters', 'read', '*/*'],
        ['database-engines', 'read', '*/*'],
        ['backup-storages', 'read', '*/*'],
        ['monitoring-instances', 'read', '*/*'],
      ]);

      await expect(page.getByRole('table')).toBeVisible();

      await expect(page.getByText(pxcDb)).toBeVisible();
      await expect(page.getByText(psmdbDb)).toBeVisible();
      await expect(page.getByText(pgDb)).toBeVisible();
    });

    test(`The user can list databases in one namespace `, async ({ page }) => {
      await setRBACPermissionsK8S([
        ['namespaces', 'read', '*'],
        ['database-clusters', 'read', `${namespace2}/*`],
        ['database-engines', 'read', '*/*'],
        ['backup-storages', 'read', '*/*'],
        ['monitoring-instances', 'read', '*/*'],
      ]);
      await expect(page.getByRole('table')).toBeVisible();

      await expect(page.getByText(pxcDb)).not.toBeVisible();
      await expect(page.getByText(psmdbDb)).toBeVisible();
      await expect(page.getByText(pgDb)).toBeVisible();
    });

    test('Delete databases', async ({ page, request }) => {
      await giveUserAdminPermissions();
      await deleteDbClusterFn(request, pxcDb, namespace1);
      await deleteDbClusterFn(request, psmdbDb, namespace2);
      await deleteDbClusterFn(request, pgDb, namespace2);

      await expect(page.getByText(pxcDb)).not.toBeVisible({ timeout: 70000 });
      await expect(page.getByText(psmdbDb)).not.toBeVisible({ timeout: 70000 });
      await expect(page.getByText(pgDb)).not.toBeVisible({ timeout: 70000 });
    });
  }
);
