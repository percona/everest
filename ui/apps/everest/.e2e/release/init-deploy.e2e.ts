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
} from '../utils/db-clusters-list';
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { getClusterDetailedInfo } from '../utils/storage-class';
import {
  moveForward,
  submitWizard,
  populateBasicInformation,
  populateResources,
  populateAdvancedConfig,
  populateMonitoringModalForm,
} from '../utils/db-wizard';
import { EVEREST_CI_NAMESPACES } from '../constants';
import { waitForStatus, waitForDelete } from '../utils/table';
import { checkError } from '../utils/generic';
import { deleteMonitoringInstance } from '../utils/monitoring-instance';

const { MONITORING_URL, MONITORING_USER, MONITORING_PASSWORD } = process.env;
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
    'Init deploy workflow',
    {
      // Create/stop/resume/delete cluster in different configurations
      tag: '@release',
    },
    () => {
      const clusterName = `${db}-${size}-deploy`;

      let storageClasses = [];
      let namespace = EVEREST_CI_NAMESPACES.EVEREST_UI;
      let monitoringName = `${db}-${size}-pmm`;

      test.beforeAll(async ({ request }) => {
        token = await getTokenFromLocalStorage();

        const { storageClassNames = [] } = await getClusterDetailedInfo(
          token,
          request
        );
        storageClasses = storageClassNames;
      });

      test(`Cluster creation with ${db} and size ${size}`, async ({
        page,
        request,
      }) => {
        // Timeout is scaled based on the cluster size to account for the additional resources needed.
        test.setTimeout(size * 120000);

        expect(storageClasses.length).toBeGreaterThan(0);

        await page.goto('/databases/new');
        await page.getByTestId('toggle-button-group-input-db-type').waitFor();
        await page.getByTestId('select-input-db-version').waitFor();

        // basic info
        await populateBasicInformation(
          page,
          db,
          storageClasses[0],
          clusterName
        );
        await moveForward(page);

        // resources
        await page
          .getByRole('button')
          .getByText(size + ' node')
          .click();
        await expect(page.getByText('Nº nodes: ' + size)).toBeVisible();
        await populateResources(page, 0.6, 1, 1, size);
        await moveForward(page);

        // backups
        await moveForward(page);

        // advanced
        await populateAdvancedConfig(page, db, '', true, '');
        await moveForward(page);

        // monitoring modal form
        await populateMonitoringModalForm(
          page,
          monitoringName,
          EVEREST_CI_NAMESPACES.EVEREST_UI,
          MONITORING_URL,
          MONITORING_USER,
          MONITORING_PASSWORD
        );
        await submitWizard(page);
        await expect(
          page.getByText('Awesome! Your database is being created!')
        ).toBeVisible();

        // go to db list and check status
        await page.goto('/databases');
        await waitForStatus(page, clusterName, 'Initializing', 15000);
        await waitForStatus(page, clusterName, 'Up', 300000);

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
        expect(addedCluster?.spec.engine.storage.size.toString()).toBe('1G');
        expect(addedCluster?.spec.proxy.expose.type).toBe('internal');
        expect(addedCluster?.spec.proxy.replicas).toBe(size);
      });

      test(`Suspend cluster with ${db} and size ${size}`, async ({ page }) => {
        test.setTimeout(size * 120000);

        await suspendDbCluster(page, clusterName);
        // One node clusters and Postgresql don't seem to show Stopping state
        if (size != 1 && db != 'postgresql') {
          await waitForStatus(page, clusterName, 'Stopping', 45000);
        }
        await waitForStatus(page, clusterName, 'Paused', 120000);
      });

      test(`Resume cluster with ${db} and size ${size}`, async ({ page }) => {
        test.setTimeout(size * 120000);

        await resumeDbCluster(page, clusterName);
        await waitForStatus(page, clusterName, 'Initializing', 45000);
        await waitForStatus(page, clusterName, 'Up', 240000);
      });

      test(`Restart cluster with ${db} and size ${size}`, async ({ page }) => {
        test.setTimeout(size * 120000);

        await restartDbCluster(page, clusterName);
        if (size != 1 && db != 'postgresql') {
          await waitForStatus(page, clusterName, 'Stopping', 45000);
        }
        await waitForStatus(page, clusterName, 'Initializing', 60000);
        await waitForStatus(page, clusterName, 'Up', 240000);
      });

      test(`Delete cluster with ${db} and size ${size}`, async ({
        page,
        request,
      }) => {
        await deleteDbCluster(page, clusterName);
        await waitForStatus(page, clusterName, 'Deleting', 15000);
        await waitForDelete(page, clusterName, 15000);
        await deleteMonitoringInstance(
          request,
          monitoringName,
          namespace,
          token
        );
      });
    }
  );
});
