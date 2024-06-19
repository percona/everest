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
import { createDbClusterFn, deleteDbClusterFn } from '../utils/db-cluster';
import { DBClusterDetailsTabs } from '../../src/pages/db-cluster-details/db-cluster-details.types';
import { clickCreateSchedule } from './utils';
import {
  findDbAndClickRow,
  gotoDbClusterBackups,
} from '../utils/db-clusters-list';
import { storageLocationAutocompleteEmptyValidationCheck } from '../utils/db-wizard';
import { STORAGE_NAMES } from '../constants';
import { waitForInitializingState } from '../utils/table';

// TODO uncomment when PATCH method is implemented
test.describe.skip('Schedules List', async () => {
  let scheduleName = 'test-name';
  const mySQLName = 'schedule-mysql';

  test.beforeAll(async ({ request }) => {
    await createDbClusterFn(request, {
      dbName: mySQLName,
      dbType: 'mysql',
      numberOfNodes: '1',
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

  test('Create schedule', async ({ page }) => {
    await findDbAndClickRow(page, mySQLName);

    const backupsTab = await page.getByTestId(DBClusterDetailsTabs.backups);
    await backupsTab.click();

    const scheduledBackupsAccordion = page.getByTestId('scheduled-backups');
    await expect(scheduledBackupsAccordion).not.toBeVisible();

    await clickCreateSchedule(page);

    const createDialog = await page.getByRole('dialog');

    const scheduleNameField = await page.getByTestId(
      'text-input-schedule-name'
    );
    expect(scheduleNameField).not.toBeEmpty();
    await scheduleNameField.fill(scheduleName);

    const storageLocationField = page.getByTestId(
      'text-input-storage-location'
    );
    await expect(storageLocationField).not.toBeEmpty();
    await storageLocationField.click();
    await storageLocationAutocompleteEmptyValidationCheck(page);
    await page.getByRole('option').first().click();
    await expect(storageLocationField).not.toBeEmpty();

    const createScheduleButton = await createDialog
      .getByRole('button')
      .filter({ hasText: 'create' });
    await createScheduleButton.click();

    await expect(page.getByTestId('scheduled-backups')).toBeVisible();
    await scheduledBackupsAccordion.click();

    expect(page.getByText('Every hour at minute 0')).toBeTruthy();

    expect(page.getByText('2 active schedules')).toBeTruthy();
  });

  test.skip('Warning should appears for schedule with the same date and storage', async ({}) => {
    //TODO a similar test is written in create.db.wizard, after solving patch problem it's better to duplicate the same for backups page
  });

  test('Creating schedule with duplicate name shows validation error', async ({
    page,
  }) => {
    await gotoDbClusterBackups(page, mySQLName);
    await clickCreateSchedule(page);

    const createDialog = await page.getByRole('dialog');
    const scheduleNameField = await page.getByTestId(
      'text-input-schedule-name'
    );
    await scheduleNameField.fill(scheduleName);
    const errorMesage = await page.getByText(
      'You already have a schedule with the same name.'
    );
    expect(errorMesage).toBeTruthy();
    await scheduleNameField.fill(`${scheduleName}-one`);

    const selectedTimeBtn = await page.getByTestId(
      'select-selected-time-button'
    );
    await selectedTimeBtn.click();
    const monthOption = await page.getByTestId('month-option');
    await monthOption.click();

    const createScheduleButton = await createDialog
      .getByRole('button')
      .filter({ hasText: 'create' });
    await createScheduleButton.click();

    const scheduledBackupsAccordion =
      await page.getByTestId('scheduled-backups');
    await scheduledBackupsAccordion.click();

    expect(page.getByText('Monthly on day 1 at 12:00 AM')).toBeTruthy();
    expect(page.getByText('2 active schedules')).toBeTruthy();
  });

  test('PostgreSQL db cannot have more than 3 active backup schedules', async ({
    page,
    request,
  }) => {
    await createDbClusterFn(request, {
      dbName: 'schedule-postgresql',
      dbType: 'postgresql',
      numberOfNodes: '1',
      backup: {
        enabled: true,
        schedules: [
          {
            backupStorageName: STORAGE_NAMES[0],
            enabled: true,
            name: 'backup-1',
            schedule: '0 * * * *',
          },
          {
            backupStorageName: STORAGE_NAMES[0],
            enabled: true,
            name: 'backup-2',
            schedule: '0 * * * *',
          },
          {
            backupStorageName: STORAGE_NAMES[0],
            enabled: true,
            name: 'backup-3',
            schedule: '0 * * * *',
          },
        ],
      },
    });

    await gotoDbClusterBackups(page, 'schedule-postgresql');
    expect(
      page.getByText('3 active schedules (maximum 3 schedules for PostgreSQL)')
    ).toBeTruthy();
    await page.getByTestId('menu-button').click();
    expect(page.getByTestId('schedule-menu-item')).toBeDisabled();
    await deleteDbClusterFn(request, 'schedule-postgresql');
  });

  test('Delete Schedule', async ({ page }) => {
    await gotoDbClusterBackups(page, mySQLName);
    const scheduledBackupsAccordion =
      await page.getByTestId('scheduled-backups');
    await scheduledBackupsAccordion.click();

    const scheduleForDeleteBtn = await page
      .getByTestId('delete-schedule-button')
      .first();
    await scheduleForDeleteBtn.click();
    await (await page.getByTestId('confirm-dialog-delete')).click();
    expect(page.getByText('1 active schedule')).toBeTruthy();
  });

  test('Edit Schedule', async ({ page }) => {
    await gotoDbClusterBackups(page, mySQLName);
    const scheduledBackupsAccordion =
      await page.getByTestId('scheduled-backups');
    await scheduledBackupsAccordion.click();

    const scheduleForEditBtn = await page
      .getByTestId('schedule-0 0 1 * *')
      .getByTestId('edit-schedule-button');

    await scheduleForEditBtn.click();

    expect(page.getByTestId('text-input-schedule-name')).not.toBeEmpty();
    expect(page.getByTestId('text-input-schedule-name')).toHaveValue(
      `${scheduleName}-one`
    );
    expect(page.getByTestId('text-input-storage-location')).not.toBeEmpty();

    await page.getByTestId('select-selected-time-button').click();
    await page.getByTestId('week-option').click();
    await page.getByTestId('select-week-day-button').click();
    await page.getByTestId('Friday').click();
    await page.getByTestId('select-hour-button').click();
    await page.getByRole('option', { name: '6' }).click();
    await page.getByTestId('select-minute-button').click();
    await page.getByRole('option', { name: '08' }).click();
    await page.getByTestId('select-am-pm-button').click();
    await page.getByRole('option', { name: 'PM' }).click();
    await page.getByTestId('form-dialog-save').click();

    expect(page.getByText('Weekly on Fridays at 6:08 PM')).toBeTruthy();
  });
});
