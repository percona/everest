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

import { test, expect } from '@playwright/test';
import {
  createBackupStorageFn,
  deleteStorageLocationFn,
} from '../utils/backup-storage';
import { moveForward } from '../utils/db-wizard';
import { EVEREST_CI_NAMESPACES } from '../constants';
import { createDbClusterFn, deleteDbClusterFn } from '../utils/db-cluster';
import { findDbAndClickRow } from '../utils/db-clusters-list';
import { DBClusterDetailsTabs } from '../../src/pages/db-cluster-details/db-cluster-details.types';
import { openCreateScheduleDialogFromDBWizard } from '../db-cluster/db-wizard/db-wizard-utils';

test.describe.serial('Namespaces: Backup Storage availability', () => {
  const pxcStorageLocationName = 'storage-location-pxc';
  const pgStorageLocationName = 'storage-location-pg';
  const pgDbName = 'pg-db';
  const pxcDbName = 'pxc-db';

  test.beforeAll(async ({ request }) => {
    await createBackupStorageFn(request, pxcStorageLocationName, [
      EVEREST_CI_NAMESPACES.PXC_ONLY,
    ]);
    await createBackupStorageFn(request, pgStorageLocationName, [
      EVEREST_CI_NAMESPACES.PG_ONLY,
    ]);

    await createDbClusterFn(
      request,
      {
        dbName: pgDbName,
        dbType: 'postgresql',
        numberOfNodes: '1',
      },
      EVEREST_CI_NAMESPACES.PG_ONLY
    );

    await createDbClusterFn(
      request,
      {
        dbName: pxcDbName,
        dbType: 'mysql',
        numberOfNodes: '1',
        backup: {
          enabled: true,
          schedules: [],
        },
      },
      EVEREST_CI_NAMESPACES.PXC_ONLY
    );
  });

  test.afterAll(async ({ request }) => {
    await deleteStorageLocationFn(request, pxcStorageLocationName);
    await deleteStorageLocationFn(request, pgStorageLocationName);
    await deleteDbClusterFn(request, pgDbName, EVEREST_CI_NAMESPACES.PG_ONLY);
    await deleteDbClusterFn(request, pxcDbName, EVEREST_CI_NAMESPACES.PXC_ONLY);
  });

  test('Backup Storage autocomplete in DB Wizard has only backup storages in selected namespace', async ({
    page,
  }) => {
    await page.goto('/databases');
    const button = page.getByTestId('add-db-cluster-button');
    await button.click();

    // setting everest-pxc namespace
    const namespacesAutocomplete = page.getByTestId(
      'k8s-namespace-autocomplete'
    );
    await namespacesAutocomplete.click();
    await page
      .getByRole('option', { name: EVEREST_CI_NAMESPACES.PXC_ONLY })
      .click();
    await expect(page.getByTestId('mysql-toggle-button')).toBeVisible();

    // Resources Step
    await moveForward(page);
    // Backups step
    await moveForward(page);

    await openCreateScheduleDialogFromDBWizard(page);
    const storageLocationAutocomplete = page.getByTestId(
      'text-input-storage-location'
    );
    await storageLocationAutocomplete.click();

    // common ui-dev backup storage from global-setup with all operators + pxc backup storage with only pxc operator
    expect(await page.getByRole('option').count()).toBe(1);
    await page.getByRole('option', { name: pxcStorageLocationName }).click();
    await page.getByTestId('form-dialog-create').click();

    const pitrCheckbox = page
      .getByTestId('switch-input-pitr-enabled')
      .getByRole('checkbox');
    await pitrCheckbox.setChecked(true);

    const pitrLocationAutocomplete = page.getByTestId(
      'pitr-storage-location-autocomplete'
    );
    await pitrLocationAutocomplete.click();
    // common ui-dev backup storage from global-setup with all operators + pxc backup storage with only pxc operator
    expect(await page.getByRole('option').count()).toBe(1);
  });

  test('Backup storage autocomplete in create new backup modal has only available storages for namespace', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickRow(page, pgDbName);

    // go to backups tab in db-cluster details
    const backupsTab = page.getByTestId(DBClusterDetailsTabs.backups);
    await backupsTab.click();

    // check backup storage dropdown in new backup modal
    await page.getByTestId('menu-button').click();
    await page.getByTestId('now-menu-item').click();
    await page.getByTestId('storage-location-autocomplete').click();
    expect(await page.getByRole('option').count()).toBe(1);
  });

  test('Backup storage autocomplete in create schedule modal has only available storages for namespace', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickRow(page, pxcDbName);

    // go to backups tab in db-cluster details
    const backupsTab = page.getByTestId(DBClusterDetailsTabs.backups);
    await backupsTab.click();

    // check backup storage dropdown in create schedule modal
    await page.getByTestId('menu-button').click();
    await page.getByTestId('schedule-menu-item').click();
    await page.getByTestId('storage-location-autocomplete').click();
    expect(await page.getByRole('option').count()).toBe(1);
  });
});
