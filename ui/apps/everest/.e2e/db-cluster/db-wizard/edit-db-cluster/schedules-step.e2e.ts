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
import { DBClusterDetailsTabs } from '../../../../src/pages/db-cluster-details/db-cluster-details.types';
import {
  createDbClusterFn,
  deleteDbClusterFn,
} from '../../../utils/db-cluster';
import {
  findDbAndClickActions,
  findDbAndClickRow,
} from '../../../utils/db-clusters-list';
import { getTokenFromLocalStorage } from '../../../utils/localStorage';
import {
  checkDbWizardEditSubmitIsAvailableAndClick,
  checkSuccessOfUpdateAndGoToDbClustersList,
} from './edit-db-cluster.utils';
import { getNamespacesFn } from '../../../utils/namespaces';
import { moveForward } from '../../../utils/db-wizard';

test.describe.serial('DB Cluster Editing Backups Step', async () => {
  let scheduleName = 'db-wizard-schedule';
  const mySQLName = 'db-backup-mysql';
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

  test('Add schedule to database with no schedule during editing in dbWizard', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickActions(page, mySQLName, 'Edit');

    // Go to Resources step
    await moveForward(page);
    // Go to Backups step
    await moveForward(page);

    const enabledBackupsCheckbox = page
      .getByTestId('switch-input-backups-enabled')
      .getByRole('checkbox');

    await expect(enabledBackupsCheckbox).not.toBeChecked();
    await enabledBackupsCheckbox.setChecked(true);

    const scheduleNameField = page.getByTestId('text-input-schedule-name');
    await expect(scheduleNameField).not.toBeEmpty();
    await scheduleNameField.fill(scheduleName);

    await expect(
      page.getByTestId('text-input-storage-location')
    ).not.toBeEmpty();
    await expect(
      page.getByText(
        'Everest will create a backup of your database every hour, starting at minute 0.'
      )
    ).toBeVisible();

    // Go to Point-in-time Recovery (PITR)
    await moveForward(page);
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

    expect(page.getByText('Every hour at minute 0')).toBeTruthy();
  });

  test('Disabling/Enabling backups for single scheduled db', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickActions(page, mySQLName, 'Edit');

    // Go to Resources step
    await moveForward(page);
    // Go to Backups step
    await moveForward(page);

    // disabling backups
    const enabledBackupsCheckbox = page
      .getByTestId('switch-input-backups-enabled')
      .getByRole('checkbox');
    await expect(enabledBackupsCheckbox).toBeChecked();
    await enabledBackupsCheckbox.setChecked(false);
    await expect(enabledBackupsCheckbox).not.toBeChecked();

    // checking the preview empty value
    expect(
      page
        .getByTestId('section-Backups')
        .getByTestId('empty-backups-preview-content')
    ).toBeTruthy();

    // Go to Point-in-time Recovery (PITR)
    await moveForward(page);
    // Go to Advanced Configuration step
    await moveForward(page);
    // Go to Monitoring step
    await moveForward(page);

    await checkDbWizardEditSubmitIsAvailableAndClick(page);
    await checkSuccessOfUpdateAndGoToDbClustersList(page);

    await findDbAndClickActions(page, mySQLName, 'Edit');

    // Go to Resources step
    await moveForward(page);
    // Go to Backups step
    await moveForward(page);

    // check that schedule hasn't been reset
    await expect(enabledBackupsCheckbox).not.toBeChecked();
    await enabledBackupsCheckbox.setChecked(true);
    await expect(page.getByTestId('text-input-schedule-name')).toHaveValue(
      scheduleName
    );

    // checking the preview actual value
    await expect(
      page.getByTestId('section-Backups').getByTestId('preview-content')
    ).toHaveText('Every hour at minute 0');
  });
});
