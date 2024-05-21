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
  createBackupStorageFn,
  deleteStorageLocationFn,
} from '../utils/backup-storage';
import { moveForward } from '../utils/db-wizard';
import { EVEREST_CI_NAMESPACES } from '../constants';
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { deleteMonitoringInstance } from '../utils/monitoring-instance';
import { setNamespace } from '../utils/namespaces';

const { MONITORING_URL, MONITORING_USER, MONITORING_PASSWORD } = process.env;

test.describe('Namespaces: Monitoring availability', () => {
  const pxcStorageLocationName = 'storage-location-pxc';
  const pxcMonitoringEndpoint = 'pxc-monitoring';
  let token = '';

  test.beforeAll(async ({ request }) => {
    token = await getTokenFromLocalStorage();
    await createBackupStorageFn(request, pxcStorageLocationName, [
      EVEREST_CI_NAMESPACES.PXC_ONLY,
    ]);
  });

  test.afterAll(async ({ request }) => {
    await deleteStorageLocationFn(request, pxcStorageLocationName);
  });

  test('Monitoring autocomplete in DB Wizard has only endpoints in selected namespace', async ({
    page,
    request,
  }) => {
    await page.goto('/databases');
    const button = page.getByTestId('add-db-cluster-button');
    await button.click();

    // setting everest-pxc namespace
    await setNamespace(page, EVEREST_CI_NAMESPACES.PXC_ONLY);

    // Resources Step
    await moveForward(page);
    // Backups step
    await moveForward(page);
    // Advanced Configuration step
    await moveForward(page);
    // Monitoring Step
    await moveForward(page);

    // check monitoring is not available
    await expect(page.getByTestId('monitoring-warning')).toBeVisible();
    expect(await page.getByLabel('Enable monitoring').isChecked()).toBeFalsy();
    await page.getByRole('button', { name: 'Add monitoring endpoint' }).click();

    // filling in monitoring modal form
    await page.getByTestId('text-input-name').fill(pxcMonitoringEndpoint);
    const namespaces = page.getByTestId('text-input-allowed-namespaces');
    await namespaces.click();
    await page
      .getByRole('option', { name: EVEREST_CI_NAMESPACES.PXC_ONLY })
      .click();
    await page.getByTestId('text-input-url').fill(MONITORING_URL);
    await page.getByTestId('text-input-user').fill(MONITORING_USER);
    await page.getByTestId('text-input-password').fill(MONITORING_PASSWORD);

    await expect(page.getByTestId('form-dialog-add')).toBeEnabled();
    await page.getByTestId('form-dialog-add').click();

    await expect(page.getByTestId('monitoring-warning')).not.toBeVisible();
    await expect(page.getByTestId('switch-input-monitoring')).toBeEnabled();

    await deleteMonitoringInstance(request, pxcMonitoringEndpoint, token);
  });
});
