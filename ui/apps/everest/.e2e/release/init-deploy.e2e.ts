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
  deleteDbCluster,
  suspendDbCluster,
  resumeDbCluster,
  restartDbCluster,
} from '@e2e/utils/db-clusters-list';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import {
  moveForward,
  submitWizard,
  populateBasicInformation,
  populateResources,
  populateAdvancedConfig,
  populateMonitoringModalForm,
} from '@e2e/utils/db-wizard';
import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import { waitForStatus, waitForDelete } from '@e2e/utils/table';
import {
  deleteMonitoringInstance,
  listMonitoringInstances,
} from '@e2e/utils/monitoring-instance';
import { getDbClusterAPI } from '@e2e/utils/db-cluster';
import { shouldExecuteDBCombination } from '@e2e/utils/generic';

const {
  MONITORING_URL,
  MONITORING_USER,
  MONITORING_PASSWORD,
} = process.env;
let token: string;

test.describe.configure({ retries: 0 });

[
  { db: 'psmdb', size: 1 },
  { db: 'psmdb', size: 3 },
  { db: 'pxc', size: 1 },
  { db: 'pxc', size: 3 },
  { db: 'postgresql', size: 1 },
  { db: 'postgresql', size: 3 },
].forEach(({ db, size }) => {
  test.describe(
    'Initial deployment',
    {
      tag: '@release',
    },
    () => {
      test.skip(!shouldExecuteDBCombination(db, size));
      test.describe.configure({ timeout: 720000 });

      const clusterName = `${db}-${size}-deploy`;

      let storageClasses = [];
      const namespace = EVEREST_CI_NAMESPACES.EVEREST_UI;
      const monitoringName = `${db}-${size}-pmm`;

      test.beforeAll(async ({ request }) => {
        token = await getTokenFromLocalStorage();

        const { storageClassNames = [] } = await getClusterDetailedInfo(
          token,
          request
        );
        storageClasses = storageClassNames;
      });

      test.afterAll(async ({ request }) => {
        // Playwright decided to execute only afterAll hook even if the group is skipped so we need a condition here
        if (shouldExecuteDBCombination(db, size)) {
          // we try to delete all monitoring instances because cluster creation expects that none exist
          // (monitoring instance is added in the form where the warning that none exist is visible)
          const monitoringInstances = await listMonitoringInstances(
            request,
            namespace,
            token
          );

          for (const instance of monitoringInstances) {
            await deleteMonitoringInstance(
              request,
              namespace,
              instance.name,
              token
            );
          }
        }
      });

      test(`Cluster creation [${db} size ${size}]`, async ({
        page,
        request,
      }) => {
        expect(storageClasses.length).toBeGreaterThan(0);

        await page.goto('/databases');
        await page.getByTestId('add-db-cluster-button').waitFor();
        await page.getByTestId('add-db-cluster-button').click();
        await page.getByTestId(`add-db-cluster-button-${db}`).click();

        // await page.getByTestId('toggle-button-group-input-db-type').waitFor();
        await page.getByTestId('select-input-db-version').waitFor();

        await test.step('Populate basic information', async () => {
          await populateBasicInformation(
            page,
            namespace,
            clusterName,
            db,
            storageClasses[0],
            false
          );
          await moveForward(page);
        });

        await test.step('Populate resources', async () => {
          await page
            .getByRole('button')
            .getByText(size + ' node')
            .click();

          await expect(page.getByText('Nodes (' + size + ')')).toBeVisible();
          await populateResources(page, 0.6, 1, 1, size);
          await moveForward(page);
        });

        await test.step('Populate backups', async () => {
          await moveForward(page);
        });

        await test.step('Populate advanced db config', async () => {
          await populateAdvancedConfig(page, db, '', true, '');
          await moveForward(page);
        });

        await test.step('Populate monitoring', async () => {
          await populateMonitoringModalForm(
            page,
            monitoringName,
            namespace,
            MONITORING_URL,
            MONITORING_USER,
            MONITORING_PASSWORD,
            false
          );
          await page.getByTestId('switch-input-monitoring').click();
          await expect(
            page.getByTestId('text-input-monitoring-instance')
          ).toHaveValue(monitoringName);
        });

        await test.step('Submit wizard', async () => {
          await submitWizard(page);

          await expect(
            page.getByText('Awesome! Your database is being created!')
          ).toBeVisible();
        });

        await test.step('Check db list and status', async () => {
          await page.goto('/databases');
          // TODO: try re-enable after fix for: https://perconadev.atlassian.net/browse/EVEREST-1693
          if (size != 1 || db != 'psmdb') {
            await waitForStatus(page, clusterName, 'Initializing', 30000);
          }
          await waitForStatus(page, clusterName, 'Up', 600000);
        });

        await test.step('Check db cluster k8s object options', async () => {
          const addedCluster = await getDbClusterAPI(
            clusterName,
            EVEREST_CI_NAMESPACES.EVEREST_UI,
            request,
            token
          );

          expect(addedCluster?.spec.engine.type).toBe(db);
          expect(addedCluster?.spec.engine.replicas).toBe(size);
          expect(['600m', '0.6']).toContain(
            addedCluster?.spec.engine.resources?.cpu.toString()
          );
          expect(addedCluster?.spec.engine.resources?.memory.toString()).toBe(
            '1G'
          );
          expect(addedCluster?.spec.engine.storage.size.toString()).toBe('1Gi');
          expect(addedCluster?.spec.proxy.expose.type).toBe('internal');
          if (db != 'psmdb') {
            expect(addedCluster?.spec.proxy.replicas).toBe(size);
          }
        });
      });

      test(`Suspend cluster [${db} size ${size}]`, async ({ page }) => {
        await suspendDbCluster(page, clusterName);
        // One node clusters and Postgresql don't seem to show Stopping state
        if (size != 1 && db != 'postgresql') {
          await waitForStatus(page, clusterName, 'Stopping', 60000);
        }
        await waitForStatus(page, clusterName, 'Paused', 240000);
      });

      test(`Resume cluster [${db} size ${size}]`, async ({ page }) => {
        await resumeDbCluster(page, clusterName);
        // TODO: try re-enable after fix for: https://perconadev.atlassian.net/browse/EVEREST-1693
        if (size != 1 || db != 'psmdb') {
          await waitForStatus(page, clusterName, 'Initializing', 45000);
        }
        await waitForStatus(page, clusterName, 'Up', 300000);
      });

      test(`Restart cluster [${db} size ${size}]`, async ({ page }) => {
        await restartDbCluster(page, clusterName);
        if (size != 1 && db != 'postgresql') {
          await waitForStatus(page, clusterName, 'Stopping', 45000);
        }
        // TODO: try re-enable after fix for: https://perconadev.atlassian.net/browse/EVEREST-1693
        if (size != 1 || db != 'psmdb') {
          await waitForStatus(page, clusterName, 'Initializing', 60000);
        }
        await waitForStatus(page, clusterName, 'Up', 300000);
      });

      test(`Delete cluster [${db} size ${size}]`, async ({ page }) => {
        await deleteDbCluster(page, clusterName);
        await waitForStatus(page, clusterName, 'Deleting', 15000);
        await waitForDelete(page, clusterName, 240000);
      });
    }
  );
});
