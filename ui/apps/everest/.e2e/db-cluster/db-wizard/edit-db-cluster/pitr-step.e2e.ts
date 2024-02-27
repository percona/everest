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
  createDbClusterFn,
  deleteDbClusterFn,
} from '../../../utils/db-cluster';
import {
  findDbAndClickActions,
  findDbAndClickRow,
} from '../../../utils/db-clusters-list';
import { getTokenFromLocalStorage } from '../../../utils/localStorage';
import { storageLocationAutocompleteEmptyValidationCheck } from '../../../utils/db-wizard';
import {
  checkDbWizardEditSubmitIsAvailableAndClick,
  checkSuccessOfUpdateAndGoToDbClustersList,
} from './edit-db-cluster.utils';
import { getNamespacesFn } from '../../../utils/namespaces';
import { STORAGE_NAMES } from '../../../constants';

test.describe.serial('DB Cluster Editing PITR Step', async () => {
  const mySQLName = 'db-pitr-mysql';
  let namespace = '';

  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    const namespaces = await getNamespacesFn(token, request);
    namespace = namespaces[0];

    await createDbClusterFn(token, request, namespaces[0], {
      dbName: mySQLName,
      dbType: 'mysql',
      numberOfNodes: '1',
    });
  });

  test.afterAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    await deleteDbClusterFn(token, request, mySQLName, namespace);
  });

  test('Enable PITR to database during editing in dbWizard', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickActions(page, mySQLName, 'Edit');

    const nextStep = page.getByTestId('db-wizard-continue-button');
    // Go to Resources step
    await nextStep.click();
    // Go to Backups step
    await nextStep.click();

    // Check and fill in backups step
    expect(page.getByTestId('pitr-no-backup-alert'));

    const backupsCheckbox = page
      .getByTestId('switch-input-backups-enabled')
      .getByRole('checkbox');
    await backupsCheckbox.setChecked(true);

    // Go to PITR step
    await nextStep.click();

    // Check PITR form
    const pitrCheckbox = page
      .getByTestId('switch-input-pitr-enabled')
      .getByRole('checkbox');
    await expect(pitrCheckbox).not.toBeChecked();
    await pitrCheckbox.setChecked(true);

    const pitrStorageLocation = page.getByTestId(
      'text-input-pitr-storage-location'
    );
    await expect(pitrStorageLocation).toBeVisible();
    await expect(pitrStorageLocation).not.toBeEmpty();
    await pitrStorageLocation.click();
    await storageLocationAutocompleteEmptyValidationCheck(
      page,
      'pitr-storage-location-autocomplete'
    );
    const storageOptions = page.getByRole('option');
    await expect(
      storageOptions.filter({ hasText: STORAGE_NAMES[0] })
    ).toBeVisible();
    await storageOptions.first().click();

    // Check the preview actual value
    await expect(
      page
        .getByTestId('section-Point-in-time Recovery')
        .getByTestId('preview-content')
    ).toHaveText('Enabled');

    // Go to Advanced Configuration step
    await nextStep.click();
    // Go to Monitoring step
    await nextStep.click();

    await checkDbWizardEditSubmitIsAvailableAndClick(page);
    await checkSuccessOfUpdateAndGoToDbClustersList(page);

    await findDbAndClickActions(page, mySQLName, 'Edit');

    // Go to Resources step
    await nextStep.click();
    // Go to Backups step
    await nextStep.click();
    await expect(backupsCheckbox).toBeChecked();

    // Go to PITR step
    await nextStep.click();
    await expect(pitrCheckbox).toBeChecked();
    await expect(pitrStorageLocation).toBeVisible();
    await expect(pitrStorageLocation).not.toBeEmpty();
  });

  test('Disable PITR for database during editing pitr step in dbWizard', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickActions(page, mySQLName, 'Edit');

    const nextStep = page.getByTestId('db-wizard-continue-button');

    // Go to Resources step
    await nextStep.click();
    // Go to Backups step
    await nextStep.click();
    // Go to PITR step
    await nextStep.click();

    // Check PITR step
    const pitrCheckbox = page
      .getByTestId('switch-input-pitr-enabled')
      .getByRole('checkbox');
    await expect(pitrCheckbox).toBeChecked();
    const pitrStorageLocation = page.getByTestId(
      'text-input-pitr-storage-location'
    );
    await expect(pitrStorageLocation).toBeVisible();
    await expect(pitrStorageLocation).not.toBeEmpty();

    // Disable PITR
    await pitrCheckbox.setChecked(false);
    // Check the preview actual value
    await expect(
      page
        .getByTestId('section-Point-in-time Recovery')
        .getByTestId('preview-content')
    ).toHaveText('Disabled');

    // Go to Advanced Configuration step
    await nextStep.click();
    // Go to Monitoring step
    await nextStep.click();

    await checkDbWizardEditSubmitIsAvailableAndClick(page);
    await checkSuccessOfUpdateAndGoToDbClustersList(page);

    // Go to DB details and check pitr
    await findDbAndClickRow(page, mySQLName);
    await expect(page.getByTestId('pitr-overview-section-text')).toHaveText(
      'Disabled'
    );
  });
});
