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
import { DBClusterDetailsTabs } from '../../../../../src/pages/db-cluster-details/db-cluster-details.types';
import { createDbClusterFn, deleteDbClusterFn } from '@e2e/utils/db-cluster';
import {
  findDbAndClickActions,
  findDbAndClickRow,
} from '@e2e/utils/db-clusters-list';
import {
  checkDbWizardEditSubmitIsAvailableAndClick,
  checkSuccessOfUpdateAndGoToDbClustersList,
} from './edit-db-cluster.utils';
import { goToStep, moveForward } from '@e2e/utils/db-wizard';
import {
  addFirstScheduleInDBWizard,
  addScheduleInDbWizard,
  fillScheduleModalForm,
} from '../db-wizard-utils';
import { waitForInitializingState } from '@e2e/utils/table';

test.describe.serial('DB Cluster Editing Backups Step', async () => {
  const mySQLName = 'db-backup-mysql';

  test.use({
    timezoneId: 'IST',
  });

  test.beforeAll(async ({ request }) => {
    await createDbClusterFn(request, {
      dbName: mySQLName,
      dbType: 'mysql',
      numberOfNodes: '1',
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
    await waitForInitializingState(page, mySQLName);
  });

  test.afterAll(async ({ request }) => {
    await deleteDbClusterFn(request, mySQLName);
  });

  test('Add schedule to database with no schedule during editing in dbWizard', async ({
    page,
  }) => {
    await findDbAndClickActions(page, mySQLName, 'Edit');
    await expect(
      page.getByTestId('toggle-button-group-input-db-type')
    ).toBeVisible();
    await goToStep(page, 'backups');
    await addFirstScheduleInDBWizard(page);
    // Go to Advanced Configuration step
    await moveForward(page);
    // Go to Monitoring step
    await moveForward(page);

    await checkDbWizardEditSubmitIsAvailableAndClick(page);
    await checkSuccessOfUpdateAndGoToDbClustersList(page);

    await findDbAndClickRow(page, mySQLName);

    // go to backups tab in db-cluster details
    const backupsTab = page.getByTestId(DBClusterDetailsTabs.backups);
    await backupsTab.click();

    // check the schedule in the list of schedules
    const scheduledBackupsAccordion = page.getByTestId('scheduled-backups');
    await expect(scheduledBackupsAccordion).toBeVisible();
    await scheduledBackupsAccordion.click();

    expect(await page.getByText('Monthly on day 10 at 1:05 AM')).toBeVisible();
  });

  test('Adding multi schedules during dbWizard editing', async ({ page }) => {
    await findDbAndClickActions(page, mySQLName, 'Edit');
    await expect(
      page.getByTestId('toggle-button-group-input-db-type')
    ).toBeVisible();
    await goToStep(page, 'backups');

    await addScheduleInDbWizard(page, {
      frequency: 'week',
      weekDay: 'Tuesdays',
      hour: '2',
      minute: '15',
      amPm: 'AM',
    });

    // Go to Advanced Configuration step
    await moveForward(page);
    // Go to Monitoring step
    await moveForward(page);

    await checkDbWizardEditSubmitIsAvailableAndClick(page);
    await checkSuccessOfUpdateAndGoToDbClustersList(page);

    await findDbAndClickRow(page, mySQLName);

    // go to backups tab in db-cluster details
    const backupsTab = page.getByTestId(DBClusterDetailsTabs.backups);
    await backupsTab.click();

    // check the schedule in the list of schedules
    const scheduledBackupsAccordion = page.getByTestId('scheduled-backups');
    await expect(scheduledBackupsAccordion).toBeVisible();
    await scheduledBackupsAccordion.click();

    await expect(
      await page.getByText('Weekly on Tuesdays at 2:15 AM')
    ).toBeVisible();
    await page.getByTestId('menu-button').click();
    await page.getByTestId('schedule-menu-item').click();
    await fillScheduleModalForm(
      page,
      {
        frequency: 'day',
        hour: '12',
        minute: '00',
        amPm: 'AM',
      },
      null,
      true,
      '1'
    );
    await page.getByTestId('form-dialog-create').click();
    await expect(await page.getByText('Daily at 12:00 AM')).toBeVisible();
  });
});
