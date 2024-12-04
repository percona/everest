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
import { createDbClusterFn, deleteDbClusterFn } from '@e2e/utils/db-cluster';
import {
  findDbAndClickActions,
  findDbAndClickRow,
} from '@e2e/utils/db-clusters-list';
import {
  goToStep,
  moveForward,
  storageLocationAutocompleteEmptyValidationCheck,
} from '@e2e/utils/db-wizard';

import { getBucketNamespacesMap } from '@e2e/constants';

import { waitForInitializingState } from '@e2e/utils/table';
import {
  checkDbWizardEditSubmitIsAvailableAndClick,
  checkSuccessOfUpdateAndGoToDbClustersList,
} from '@e2e/pr/db-cluster-details/edit-db-cluster/edit-db-cluster.utils';
import { addFirstScheduleInDBWizard } from '@e2e/pr/db-cluster/db-wizard/db-wizard-utils';

const openPitrEditModal = async (page: Page) => {
  const editResourcesButton = page.getByTestId('edit-pitr-button');
  await editResourcesButton.waitFor();
  await editResourcesButton.click();
  expect(page.getByTestId('edit-pitr-form-dialog')).toBeVisible();
};

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
            backupStorageName: getBucketNamespacesMap()[0][0],
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

  test('Enable PITR to database during editing', async ({ page }) => {
    await findDbAndClickRow(page, mySQLName);

    await test.step('Open edit pitr modal', async () => {
      await openPitrEditModal(page);
    });

    await test.step('Fill pitr', async () => {
      const pitrCheckbox = page
        .getByTestId('switch-input-enabled')
        .getByRole('checkbox');
      await expect(pitrCheckbox).not.toBeChecked();
      await pitrCheckbox.setChecked(true);
      const pitrStorageLocation = page.getByTestId(
        'text-input-storage-location'
      );
      await expect(pitrStorageLocation).toBeVisible();
      await expect(pitrStorageLocation).not.toBeEmpty();
      await pitrStorageLocation.click();
      await storageLocationAutocompleteEmptyValidationCheck(
        page,
        'storage-location-autocomplete'
      );
      expect(page.getByTestId('form-dialog-save')).toBeDisabled();
      const storageOptions = page.getByRole('option');
      await expect(
        storageOptions.filter({ hasText: getBucketNamespacesMap()[0][0] })
      ).toBeVisible();
      await storageOptions.first().click();
    });

    await test.step('Submit modal form', async () => {
      expect(page.getByTestId('form-dialog-save')).not.toBeDisabled();
      await page.getByTestId('form-dialog-save').click();
    });

    await test.step('Check pitr was succesfully updated', async () => {
      await expect(
        page
          .getByTestId('pitr-status-overview-section-row')
          .filter({ hasText: 'Enabled' })
      ).toBeVisible();
      await expect(
        page
          .getByTestId('backup-storage-overview-section-row')
          .filter({ hasText: 'bucket-1' })
      ).toBeVisible();
    });
  });

  test('Disable PITR for database during editing', async ({ page }) => {
    await findDbAndClickRow(page, mySQLName);

    await test.step('Open edit pitr modal', async () => {
      await openPitrEditModal(page);
    });

    await test.step('Disable pitr', async () => {
      const pitrCheckbox = page
        .getByTestId('switch-input-enabled')
        .getByRole('checkbox');

      await expect(pitrCheckbox).toBeChecked();
      const pitrStorageLocation = page.getByTestId(
        'text-input-storage-location'
      );
      await expect(pitrStorageLocation).toBeVisible();
      await expect(pitrStorageLocation).not.toBeEmpty();

      await pitrCheckbox.setChecked(false);
    });

    await test.step('Submit modal form', async () => {
      expect(page.getByTestId('form-dialog-save')).not.toBeDisabled();
      await page.getByTestId('form-dialog-save').click();
    });

    await test.step('Check pitr was succesfully updated', async () => {
      await expect(
        page
          .getByTestId('pitr-status-overview-section-row')
          .filter({ hasText: 'Disabled' })
      ).toBeVisible();
      await expect(
        page
          .getByTestId('backup-storage-overview-section-row')
          .filter({ hasText: 'bucket-1' })
      ).not.toBeVisible();
    });
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
        .getByText(`Storage: ${getBucketNamespacesMap()[0][0]}`)
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
