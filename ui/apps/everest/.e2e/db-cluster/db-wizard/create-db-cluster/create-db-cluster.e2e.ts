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
  getEnginesLatestRecommendedVersions,
  getEnginesVersions,
} from '../../../utils/database-engines';
import { deleteDbClusterFn } from '../../../utils/db-cluster';
import { getTokenFromLocalStorage } from '../../../utils/localStorage';
import { getClusterDetailedInfo } from '../../../utils/storage-class';
import { advancedConfigurationStepCheck } from './steps/advanced-configuration-step';
import { backupsStepCheck } from './steps/backups-step';
import { basicInformationStepCheck } from './steps/basic-information-step';
import { resourcesStepCheck } from './steps/resources-step';
import {
  goToLastAndSubmit,
  goToStep,
  moveBack,
  moveForward,
  setPitrEnabledStatus,
  submitWizard,
} from '../../../utils/db-wizard';
import { EVEREST_CI_NAMESPACES } from '../../../constants';
import {
  addFirstScheduleInDBWizard,
  fillScheduleModalForm,
  openCreateScheduleDialogFromDBWizard,
} from '../db-wizard-utils';
import { findDbAndClickActions } from '../../../utils/db-clusters-list';
import { waitForInitializingState } from '../../../utils/table';

test.describe('DB Cluster creation', () => {
  // Johannesburg is UTC+2, with ou without DST
  test.use({
    timezoneId: 'Africa/Johannesburg',
  });

  let engineVersions = {
    pxc: [],
    psmdb: [],
    postgresql: [],
  };
  let storageClasses = [];
  // let monitoringInstancesList = [];
  let namespace = EVEREST_CI_NAMESPACES.EVEREST_UI;

  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    engineVersions = await getEnginesVersions(token, namespace, request);

    const { storageClassNames = [] } = await getClusterDetailedInfo(
      token,
      request
    );
    storageClasses = storageClassNames;

    // monitoringInstancesList = await getMonitoringInstanceList(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases/new');
    await page.getByTestId('toggle-button-group-input-db-type').waitFor();
    await page.getByTestId('select-input-db-version').waitFor();
  });

  test.skip('Cluster creation with an incomplete list of DBEngines', () => {
    // TODO after the https://jira.percona.com/browse/EVEREST-203 is ready
    // 1) rewrite the starting pipeline of launching everest to launch everest without clusters
    // 2) add 2 clusters using new methods from EVEREST-203
    // 3) check that the default parameters for MySQL are changed with parameters for the first available dbEngine
  });

  test('Cluster defaults for namespaces with all operators', async ({
    page,
  }) => {
    const expectedNodesOrder = [3, 3, 2];
    const dbEnginesButtons = page
      .getByTestId('toggle-button-group-input-db-type')
      .getByRole('button');

    expect(await dbEnginesButtons.count()).toBe(3);
    // MySQL is our default DB type
    expect(await page.getByTestId('mysql-toggle-button')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    for (let i = 0; i < 3; i++) {
      await dbEnginesButtons.nth(i).click();
      expect(
        await page.getByTestId('select-input-db-version').inputValue()
      ).toBeDefined();

      await moveForward(page);

      expect(
        await page.getByTestId(`toggle-button-nodes-${expectedNodesOrder[i]}`)
      ).toHaveAttribute('aria-pressed', 'true');

      // We click on the first button to make sure it always goes back to defaults afterwards
      await page.getByTestId('toggle-button-nodes-1').click();

      await moveBack(page);
    }
  });

  test('Cluster creation', async ({ page, request }) => {
    const clusterName = 'db-cluster-ui-test';
    const recommendedEngineVersions = await getEnginesLatestRecommendedVersions(
      namespace,
      request
    );
    let dbName: string;

    expect(storageClasses.length).toBeGreaterThan(0);

    await basicInformationStepCheck(
      page,
      engineVersions,
      recommendedEngineVersions,
      storageClasses,
      clusterName
    );

    dbName = await page.getByTestId('text-input-db-name').inputValue();

    await moveForward(page);
    await expect(page.getByText('Number of nodes: 3')).toBeVisible();

    await resourcesStepCheck(page);
    await moveForward(page);

    await backupsStepCheck(page);

    await moveForward(page);

    await advancedConfigurationStepCheck(page);
    await moveForward(page);

    // Test the mechanism for default number of nodes
    await page.getByTestId('button-edit-preview-basic-information').click();
    // Here we test that version wasn't reset to default
    await expect(page.getByText('Version: 5.0.7-6')).toBeVisible();

    // Make sure name doesn't change when we go back to first step
    expect(await page.getByTestId('text-input-db-name').inputValue()).toBe(
      dbName
    );
    await page.getByTestId('postgresql-toggle-button').click();
    await expect(page.getByText('Number of nodes: 2')).toBeVisible();
    // Now we change the number of nodes
    await page.getByTestId('button-edit-preview-resources').click();
    await page.getByTestId('toggle-button-nodes-3').click();
    await page.getByTestId('toggle-button-nodes-2').click();
    await page.getByTestId('button-edit-preview-basic-information').click();
    // Because 2 nodes is not valid for MongoDB, the default will be picked
    await page.getByTestId('mongodb-toggle-button').click();
    await expect(page.getByText('Number of nodes: 3')).toBeVisible();
    await page.getByTestId('button-edit-preview-backups').click();

    await expect(page.getByTestId('radio-option-logical')).not.toBeVisible();

    await page.getByTestId('button-edit-preview-monitoring').click();

    // await monitoringStepCheck(page, monitoringInstancesList);
    await submitWizard(page);
    await expect(
      page.getByText('Awesome! Your database is being created!')
    ).toBeVisible();

    const response = await request.get(
      `/v1/namespaces/${namespace}/database-clusters`,
      {
        headers: {
          Authorization: `Bearer ${await getTokenFromLocalStorage()}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    // TODO replace with correct payload typings from GET DB Clusters
    const { items: clusters } = await response.json();

    const addedCluster = clusters.find(
      (cluster) => cluster.metadata.name === clusterName
    );

    await deleteDbClusterFn(request, addedCluster?.metadata.name, namespace);
    //TODO: Add check for PITR ones backend is ready

    expect(addedCluster).not.toBeUndefined();
    expect(addedCluster?.spec.engine.type).toBe('psmdb');
    expect(addedCluster?.spec.engine.replicas).toBe(3);
    expect(['600m', '0.6']).toContain(
      addedCluster?.spec.engine.resources?.cpu.toString()
    );
    expect(addedCluster?.spec.engine.resources?.memory.toString()).toBe('1G');
    expect(addedCluster?.spec.engine.storage.size.toString()).toBe('1G');
    expect(addedCluster?.spec.proxy.expose.type).toBe('internal');
    expect(addedCluster?.spec.proxy.replicas).toBe(3);
    // expect(addedCluster?.spec.proxy.expose.ipSourceRanges).toEqual([
    //   '192.168.1.1/24',
    //   '192.168.1.0',
    // ]);
    expect(addedCluster?.spec.engine.storage.class).toBe(storageClasses[0]);
    expect(addedCluster?.spec.backup.schedules[0].retentionCopies).toBe(1);
    // Verify timezone conversion was applied to the schedule cron
    // Day 10, 1h05 in Johannesburg timezone is day 9, 23h05 UTC
    expect(addedCluster?.spec.backup.schedules[0].schedule).toBe('5 23 9 * *');
  });

  test('PITR should be disabled when backups has no schedules checked', async ({
    page,
  }) => {
    expect(storageClasses.length).toBeGreaterThan(0);

    const mySQLButton = page.getByTestId('mysql-toggle-button');
    await mySQLButton.click();

    await moveForward(page);
    await moveForward(page);
    await expect(
      page.getByText('You don’t have any backup schedules yet.')
    ).toBeVisible();
    const enabledPitrCheckbox = page
      .getByTestId('switch-input-pitr-enabled-label')
      .getByRole('checkbox');
    await expect(enabledPitrCheckbox).not.toBeChecked();
    await expect(enabledPitrCheckbox).toBeDisabled();
    await addFirstScheduleInDBWizard(page);
    await expect(enabledPitrCheckbox).not.toBeChecked();
    await expect(enabledPitrCheckbox).not.toBeDisabled();
    await enabledPitrCheckbox.setChecked(true);
    await expect(
      page.getByTestId('text-input-pitr-storage-location')
    ).toBeVisible();
  });

  test.skip('Cancel wizard', async ({ page }) => {
    await page.getByTestId('mongodb-toggle-button').click();
    await page.getByTestId('text-input-db-name').fill('new-cluster');
    await page.getByTestId('text-input-storage-class').click();
    await page.getByRole('option').first().click();
    await moveForward(page);

    await expect(
      page.getByRole('heading', {
        name: 'Configure the resources your new database will have access to.',
      })
    ).toBeVisible();

    await page.getByTestId('toggle-button-nodes-3').click();
    await page.getByTestId('toggle-button-large').click();
    await page.getByTestId('text-input-disk').fill('150');
    await moveForward(page);

    // await expect(
    //   page.getByRole('heading', {
    //     name: 'Specify how often you want to run backup jobs for your database.',
    //   })
    // ).toBeVisible();
    //
    // await page.getByTestId('text-input-storage-location').click();
    //
    // const storageOptions = page.getByRole('option');
    //
    // expect(storageOptions.filter({ hasText: 'ui-dev' })).toBeVisible();
    // await storageOptions.first().click();
    //
    // await await moveForward(page);

    await expect(
      page.getByRole('heading', { name: 'Advanced Configurations' })
    ).toBeVisible();

    await page.getByTestId('db-wizard-cancel-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByText('Yes, cancel').click();

    await expect(page).toHaveURL('/databases');
  });

  // TODO uncomment when DB Cluster PATCH is available
  test.skip('Multiple Mongo schedules', async ({ page, request }) => {
    test.slow();
    const clusterName = 'multi-schedule-test';
    const recommendedEngineVersions = await getEnginesLatestRecommendedVersions(
      namespace,
      request
    );

    await basicInformationStepCheck(
      page,
      engineVersions,
      recommendedEngineVersions,
      storageClasses,
      clusterName
    );
    await moveForward(page);
    await resourcesStepCheck(page);
    await moveForward(page);
    await backupsStepCheck(page);
    await page
      .getByTestId('switch-input-pitr-enabled-label')
      .getByRole('checkbox')
      .check();
    await moveForward(page);
    await advancedConfigurationStepCheck(page);
    await moveForward(page);
    await submitWizard(page);
    await expect(page.getByTestId('db-wizard-goto-db-clusters')).toBeVisible();

    await page.goto('/databases');
    await waitForInitializingState(page, clusterName);
    await page.goto(`/databases/${namespace}/${clusterName}/backups`);
    await page.getByTestId('menu-button').click();
    await page.getByTestId('schedule-menu-item').click();
    await page.getByTestId('form-dialog-create').click();
    await expect(page.getByText('2 active schedules')).toBeVisible();

    // We disable PITR
    await page.goto('/databases');
    await waitForInitializingState(page, clusterName);
    await findDbAndClickActions(page, clusterName, 'Edit');
    await goToStep(page, 'backups');
    await setPitrEnabledStatus(page, false);
    await goToLastAndSubmit(page);

    // We turn it back on to make sure nothing breaks
    await page.goto('/databases');
    await findDbAndClickActions(page, clusterName, 'Edit');
    await goToStep(page, 'backups');
    await setPitrEnabledStatus(page, true);

    await deleteDbClusterFn(request, clusterName, namespace);
  });

  test('Warning should appears for schedule with the same date and storage', async ({
    page,
  }) => {
    await page.goto('/databases');
    await page.getByTestId('add-db-cluster-button').click();
    await expect(
      page.getByTestId('toggle-button-group-input-db-type')
    ).toBeVisible();

    // Resources Step
    await moveForward(page);
    // Backups step
    await moveForward(page);
    await addFirstScheduleInDBWizard(page);
    await openCreateScheduleDialogFromDBWizard(page);
    await expect(page.getByTestId('same-schedule-warning')).not.toBeVisible();
    await fillScheduleModalForm(page);
    await expect(page.getByTestId('same-schedule-warning')).toBeVisible();
  });
});
