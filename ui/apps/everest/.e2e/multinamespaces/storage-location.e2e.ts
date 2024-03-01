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
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { findDbAndClickRow } from '../utils/db-clusters-list';
import { DBClusterDetailsTabs } from '../../src/pages/db-cluster-details/db-cluster-details.types';

test.describe.serial('Namespaces: Storage Location availability', () => {
  const pxcStorageLocationName = 'storage-location-pxc';
  const pgStorageLocationName = 'storage-location-pg';
  const pgDbName = 'pg-db';
  const pxcDbName = 'pxc-db';
  let token = '';

  test.beforeAll(async ({ request }) => {
    token = await getTokenFromLocalStorage();
    await createBackupStorageFn(request, pxcStorageLocationName, [
      EVEREST_CI_NAMESPACES.PXC_ONLY,
    ]);
    await createBackupStorageFn(request, pgStorageLocationName, [
      EVEREST_CI_NAMESPACES.PG_ONLY,
    ]);

    await createDbClusterFn(token, request, EVEREST_CI_NAMESPACES.PG_ONLY, {
      dbName: pgDbName,
      dbType: 'postgresql',
      numberOfNodes: '1',
    });

    await createDbClusterFn(token, request, EVEREST_CI_NAMESPACES.PXC_ONLY, {
      dbName: pxcDbName,
      dbType: 'mysql',
      numberOfNodes: '1',
      backup: {
        enabled: true,
        schedules: [],
      },
    });
  });

  test.afterAll(async ({ request }) => {
    await deleteStorageLocationFn(request, pxcStorageLocationName);
    await deleteStorageLocationFn(request, pgStorageLocationName);
    await deleteDbClusterFn(
      token,
      request,
      pgDbName,
      EVEREST_CI_NAMESPACES.PG_ONLY
    );
    await deleteDbClusterFn(
      token,
      request,
      pxcDbName,
      EVEREST_CI_NAMESPACES.PXC_ONLY
    );
  });

  test('Storage Location autocomplete in DB Wizard has only storage locations in selected namespace', async ({
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

    // Resources Step
    await moveForward(page);
    // Backups step
    await moveForward(page);
    const storageLocationAutocomplete = page.getByTestId(
      'storage-location-autocomplete'
    );
    await storageLocationAutocomplete.click();

    // common ui-dev storage location from global-setup with all operators + pxc storage location with only pxc operator
    expect(await page.getByRole('option').count()).toBe(1);
    await page.getByRole('option', { name: pxcStorageLocationName }).click();

    // PITR step
    await moveForward(page);

    const pitrCheckbox = page
      .getByTestId('switch-input-pitr-enabled')
      .getByRole('checkbox');
    await pitrCheckbox.setChecked(true);

    const pitrLocationAutocomplete = page.getByTestId(
      'pitr-storage-location-autocomplete'
    );
    await pitrLocationAutocomplete.click();
    // common ui-dev storage location from global-setup with all operators + pxc storage location with only pxc operator
    expect(await page.getByRole('option').count()).toBe(1);
  });

  test('Backups step is disabled when selected namespace has no storage location', async ({
    page,
  }) => {
    await page.goto('/databases');
    const button = page.getByTestId('add-db-cluster-button');
    await button.click();

    const namespacesAutocomplete = page.getByTestId(
      'k8s-namespace-autocomplete'
    );
    await namespacesAutocomplete.click();
    // setting namespace with no storage location for it
    await page
      .getByRole('option', { name: EVEREST_CI_NAMESPACES.PSMDB_ONLY })
      .click();

    // Resources Step
    await moveForward(page);
    // Backups step
    await moveForward(page);
    await expect(page.getByTestId('no-storage-message')).toBeVisible();
    await expect(page.getByTestId('db-wizard-continue-button')).toBeDisabled();
  });

  test('Storage Location autocomplete in create new backup modal has only available storages for namespace', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickRow(page, pgDbName);

    // go to backups tab in db-cluster details
    const backupsTab = page.getByTestId(DBClusterDetailsTabs.backups);
    await backupsTab.click();

    // check storage location dropdown in new backup modal
    await page.getByTestId('menu-button').click();
    await page.getByTestId('now-menu-item').click();
    await page.getByTestId('storage-location-autocomplete').click();
    expect(await page.getByRole('option').count()).toBe(1);
  });

  test('Storage Location autocomplete in create schedule modal has only available storages for namespace', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickRow(page, pxcDbName);

    // go to backups tab in db-cluster details
    const backupsTab = page.getByTestId(DBClusterDetailsTabs.backups);
    await backupsTab.click();

    // check storage location dropdown in create schedule modal
    await page.getByTestId('menu-button').click();
    await page.getByTestId('schedule-menu-item').click();
    await page.getByTestId('storage-location-autocomplete').click();
    expect(await page.getByRole('option').count()).toBe(1);
  });
});
