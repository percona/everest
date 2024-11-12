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
import { checkError } from '@e2e/utils/generic';
import {
  deleteMonitoringInstance,
  listMonitoringInstances,
} from '@e2e/utils/monitoring-instance';

const {
  MONITORING_URL,
  MONITORING_USER,
  MONITORING_PASSWORD,
  SELECT_DB,
  SELECT_SIZE,
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
      test.skip(
        () =>
          (SELECT_DB !== db && !!SELECT_DB) ||
          (SELECT_SIZE !== size.toString() && !!SELECT_SIZE)
      );
      test.describe.configure({ timeout: 900000 });

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
      });

      test(`Cluster creation [${db} size ${size}]`, async ({
        page,
        request,
      }) => {
        expect(storageClasses.length).toBeGreaterThan(0);

        await page.goto('/databases/new');
        await page.getByTestId('toggle-button-group-input-db-type').waitFor();
        await page.getByTestId('select-input-db-version').waitFor();

        await test.step('Populate basic information', async () => {
          await populateBasicInformation(
            page,
            db,
            storageClasses[0],
            clusterName
          );
          await moveForward(page);
        });

        await test.step('Populate resources', async () => {
          await page
            .getByRole('button')
            .getByText(size + ' node')
            .click();
          await expect(page.getByText('Nº nodes: ' + size)).toBeVisible();
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
            MONITORING_PASSWORD
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
          await waitForStatus(page, clusterName, 'Initializing', 15000);
          await waitForStatus(page, clusterName, 'Up', 600000);
        });

        await test.step('Check db cluster k8s object options', async () => {
          const response = await request.get(
            `/v1/namespaces/${namespace}/database-clusters`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          await checkError(response);

          // TODO: replace with correct payload typings from GET DB Clusters
          const { items: clusters } = await response.json();

          const addedCluster = clusters.find(
            (cluster) => cluster.metadata.name === clusterName
          );

          expect(addedCluster).not.toBeUndefined();
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
          await waitForStatus(page, clusterName, 'Stopping', 45000);
        }
        await waitForStatus(page, clusterName, 'Paused', 120000);
      });

      test(`Resume cluster [${db} size ${size}]`, async ({ page }) => {
        await resumeDbCluster(page, clusterName);
        await waitForStatus(page, clusterName, 'Initializing', 45000);
        await waitForStatus(page, clusterName, 'Up', 240000);
      });

      test(`Restart cluster [${db} size ${size}]`, async ({ page }) => {
        await restartDbCluster(page, clusterName);
        if (size != 1 && db != 'postgresql') {
          await waitForStatus(page, clusterName, 'Stopping', 45000);
        }
        await waitForStatus(page, clusterName, 'Initializing', 60000);
        await waitForStatus(page, clusterName, 'Up', 240000);
      });

      test(`Delete cluster [${db} size ${size}]`, async ({ page }) => {
        await deleteDbCluster(page, clusterName);
        await waitForStatus(page, clusterName, 'Deleting', 15000);
        await waitForDelete(page, clusterName, 120000);
      });
    }
  );
});
