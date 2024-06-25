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
import {
  goToStep,
  moveForward,
  storageLocationAutocompleteEmptyValidationCheck,
} from '../../../utils/db-wizard';
import {
  checkDbWizardEditSubmitIsAvailableAndClick,
  checkSuccessOfUpdateAndGoToDbClustersList,
} from './edit-db-cluster.utils';
import { STORAGE_NAMES } from '../../../constants';
import { addFirstScheduleInDBWizard } from '../db-wizard-utils';
import { waitForInitializingState } from '../../../utils/table';

test.describe.serial('MySQL PITR editing', async () => {
  const mySQLName = 'db-pitr-mysql';

  test.beforeAll(async ({ request }) => {
    await createDbClusterFn(request, {
      dbName: mySQLName,
      dbType: 'mysql',
      numberOfNodes: '1',
      cpu: 1,
      disk: 1,
      memory: 1,
      backup: {
        enabled: true,
        schedules: [
          {
            backupStorageName: STORAGE_NAMES[0],
            enabled: true,
            name: 'backup-1',
            schedule: '0 * * * *',
          },
        ],
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
    await waitForInitializingState(page, mySQLName);
  });

  test.afterAll(async ({ request }) => {
    await deleteDbClusterFn(request, mySQLName);
  });

  test('Enable PITR to database during editing in dbWizard', async ({
    page,
  }) => {
    await findDbAndClickActions(page, mySQLName, 'Edit', 'UP');
    await expect(
      page.getByTestId('toggle-button-group-input-db-type')
    ).toBeVisible();
    await goToStep(page, 'backups');

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
      storageOptions.filter({ hasText: STORAGE_NAMES[1] })
    ).toBeVisible();
    await storageOptions.first().click();

    // Check the preview actual value
    const pitrPreviewText = (
      await page
        .getByTestId('section-Backups')
        .getByTestId('preview-content')
        .allInnerTexts()
    )[1];
    expect(pitrPreviewText).toBe('PITR Enabled');

    // Go to Advanced Configuration step
    await moveForward(page);
    // Go to Monitoring step
    await moveForward(page);

    await checkDbWizardEditSubmitIsAvailableAndClick(page);
    await checkSuccessOfUpdateAndGoToDbClustersList(page);

    await findDbAndClickActions(page, mySQLName, 'Edit');

    // Go to PITR
    await goToStep(page, 'backups');
    await expect(pitrCheckbox).toBeChecked();
    await expect(pitrStorageLocation).toBeVisible();
    await expect(pitrStorageLocation).not.toBeEmpty();
  });

  test('Disable PITR for database during editing in dbWizard', async ({
    page,
  }) => {
    await findDbAndClickActions(page, mySQLName, 'Edit');
    await expect(page.getByTestId('mysql-toggle-button')).toBeVisible();

    // Check PITR step
    await goToStep(page, 'backups');
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
    const pitrPreviewText = (
      await page
        .getByTestId('section-Backups')
        .getByTestId('preview-content')
        .allInnerTexts()
    )[1];
    expect(pitrPreviewText).toBe('PITR Disabled');

    await goToStep(page, 'monitoring');

    await checkDbWizardEditSubmitIsAvailableAndClick(page);
    await checkSuccessOfUpdateAndGoToDbClustersList(page);

    // Go to DB details and check pitr
    await findDbAndClickRow(page, mySQLName);
    await expect(page.getByTestId('pitr-overview-section-text')).toHaveText(
      'Disabled'
    );
  });
});

test.describe.serial('MongoDb PITR editing', async () => {
  const psmdbName = 'db-pitr-psmdb';

  test.beforeAll(async ({ request }) => {
    await createDbClusterFn(request, {
      dbName: psmdbName,
      dbType: 'mongodb',
      numberOfNodes: '3',
      cpu: 1,
      disk: 1,
      memory: 1,
    });
  });

  test.afterAll(async ({ request }) => {
    await deleteDbClusterFn(request, psmdbName);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
    await waitForInitializingState(page, psmdbName);
  });

  test('Enable PITR to database during editing in dbWizard', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickActions(page, psmdbName, 'Edit', 'UP');
    await expect(
      page.getByTestId('toggle-button-group-input-db-type')
    ).toBeVisible();
    await goToStep(page, 'backups');

    const pitrCheckbox = page
      .getByTestId('switch-input-pitr-enabled')
      .getByRole('checkbox');
    await expect(pitrCheckbox).not.toBeChecked();
    await expect(pitrCheckbox).toBeDisabled();
    await addFirstScheduleInDBWizard(page);
    await expect(pitrCheckbox).not.toBeDisabled();
    await expect(
      page
        .getByTestId('switch-input-pitr-enabled-label')
        .getByText(`Storage: ${STORAGE_NAMES[1]}`)
    ).toBeVisible();

    // TODO move to schedules part
    // MongoDB could create schedules only with the one of storages, so for not first schedules storage should be disabled
    await expect(
      page.getByText(
        'The backup storage you select for your first backup schedule will be used for al'
      )
    ).toBeVisible();
    await page.getByTestId('create-schedule').click();
    const scheduleStorageLocation = page.getByTestId(
      'text-input-storage-location'
    );
    await expect(scheduleStorageLocation).toBeDisabled();
    await expect(scheduleStorageLocation).not.toBeEmpty();
    await page.getByTestId('close-dialog-icon').click();

    // Enable pitr
    await pitrCheckbox.setChecked(true);
    await expect(pitrCheckbox).toBeChecked();

    // Check the preview actual value
    const pitrPreviewText = (
      await page
        .getByTestId('section-Backups')
        .getByTestId('preview-content')
        .allInnerTexts()
    )[1];
    expect(pitrPreviewText).toBe('PITR Enabled');

    await goToStep(page, 'monitoring');
    await checkDbWizardEditSubmitIsAvailableAndClick(page);
    await checkSuccessOfUpdateAndGoToDbClustersList(page);

    await findDbAndClickActions(page, psmdbName, 'Edit');
    await goToStep(page, 'backups');
    await expect(pitrCheckbox).toBeChecked();
  });
});
