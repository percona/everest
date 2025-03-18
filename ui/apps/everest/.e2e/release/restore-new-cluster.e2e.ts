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
  gotoDbClusterBackups,
  gotoDbClusterRestores,
  restartDbCluster,
  resumeDbCluster,
  suspendDbCluster,
} from '@e2e/utils/db-clusters-list';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import {
  moveForward,
  submitWizard,
  populateBasicInformation,
  populateResources,
  populateAdvancedConfig,
} from '@e2e/utils/db-wizard';
import {
  fillScheduleModalForm,
  ScheduleTimeOptions,
} from '@e2e/pr/db-cluster/db-wizard/db-wizard-utils';
import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import {
  waitForStatus,
  waitForDelete,
  findRowAndClickActions,
} from '@e2e/utils/table';
import { clickCreateSchedule } from '@e2e/pr/db-cluster-details/utils';
import { prepareTestDB, dropTestDB, queryTestDB } from '@e2e/utils/db-cmd-line';
import { getDbClusterAPI } from '@e2e/utils/db-cluster';
import { shouldExecuteDBCombination } from '@e2e/utils/generic';

let token: string;

test.describe.configure({ retries: 0 });

function getNextScheduleMinute(incrementMinutes: number): string {
  const d: number = new Date().getMinutes();
  const minute: number = (d + incrementMinutes) % 60;

  return minute.toString();
}

[
  { db: 'psmdb', size: 3 },
  { db: 'pxc', size: 3 },
  { db: 'postgresql', size: 3 },
].forEach(({ db, size }) => {
  test.describe(
    'Restore to a new cluster',
    {
      tag: '@release',
    },
    () => {
      test.skip(!shouldExecuteDBCombination(db, size));
      test.describe.configure({ timeout: 720000 });

      const clusterName = `${db}-${size}-schbkp`;
      let restoredClusterName: string;

      let storageClasses = [];
      const namespace = EVEREST_CI_NAMESPACES.EVEREST_UI;
      const monitoringName = 'e2e-endpoint-0';

      test.beforeAll(async ({ request }) => {
        token = await getTokenFromLocalStorage();

        const { storageClassNames = [] } = await getClusterDetailedInfo(
          token,
          request
        );
        storageClasses = storageClassNames;
      });

      test(`Create cluster [${db} size ${size}]`, async ({ page, request }) => {
        expect(storageClasses.length).toBeGreaterThan(0);

        await page.goto('/databases');
        await page.getByTestId('add-db-cluster-button').waitFor();
        await page.getByTestId('add-db-cluster-button').click();
        await page.getByTestId(`add-db-cluster-button-${db}`).click();

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
          await page.getByTestId('switch-input-monitoring').click();
          await page
            .getByTestId('text-input-monitoring-instance')
            .fill(monitoringName);
          await expect(
            page.getByTestId('text-input-monitoring-instance')
          ).toHaveValue(monitoringName);
        });

        await test.step('Submit wizard', async () => {
          await submitWizard(page);
          
        });

        await test.step('Check db list and status', async () => {
          await page.goto('/databases');
          await waitForStatus(page, clusterName, 'Initializing', 15000);
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

      test(`Add data [${db} size ${size}]`, async () => {
        await prepareTestDB(clusterName, namespace);
      });

      test(`Create backup schedules [${db} size ${size}]`, async ({ page }) => {
        test.setTimeout(60 * 1000); // Increased timeout
      
        const scheduleMinute1 = getNextScheduleMinute(2);
        const timeOption1: ScheduleTimeOptions = {
          frequency: 'hour',
          day: null,
          amPm: null,
          hour: null,
          minute: scheduleMinute1,
        };
      
        await test.step('Create first schedule', async () => {
          await gotoDbClusterBackups(page, clusterName);
          await clickCreateSchedule(page);
          await fillScheduleModalForm(page, timeOption1, 'first-schedule', false, '0');
          await page.getByTestId('form-dialog-create').click();

          await page.waitForTimeout(2000);
      
          // **Check if schedule exists, otherwise open dropdown and check again**
          if (!(await page.getByText(`Every hour at minute ${scheduleMinute1}`).isVisible())) {
            await page.getByTestId('scheduled-backups').click();
            await expect(page.getByText(`Every hour at minute ${scheduleMinute1}`)).toBeVisible();
          }
        });
      
        const scheduleMinute2 = getNextScheduleMinute(3);
        const timeOption2: ScheduleTimeOptions = {
          frequency: 'hour',
          day: null,
          amPm: null,
          hour: null,
          minute: scheduleMinute2,
        };
      
        await test.step('Create second schedule', async () => {
          await clickCreateSchedule(page);
          await fillScheduleModalForm(page, timeOption2, 'second-schedule', false, '0');
          await page.getByTestId('form-dialog-create').click();

          //Wait required for the schedule to show up
          await page.waitForTimeout(5000);
      
          // **Check if schedule exists, otherwise open dropdown and check again**
          if (!(await page.getByText(`Every hour at minute ${scheduleMinute2}`).isVisible())) {
            await page.getByTestId('scheduled-backups').click();
            await expect(page.getByText(`Every hour at minute ${scheduleMinute2}`)).toBeVisible();
          }
        });
      });
      
      test(`Wait for two backups to succeeded [${db} size ${size}]`, async ({
        page,
      }) => {
        await gotoDbClusterBackups(page, clusterName);
        await expect(page.getByText(`${db}-${size}-schbkp-`)).toHaveCount(2, {
          timeout: 360000,
        });
        await expect(page.getByText('Succeeded')).toHaveCount(2, {
          timeout: 360000,
        });
      });

      //Not required as we are creating a new cluster from a backup, not restoring to the same db cluster
      // test(`Delete data [${db} size ${size}]`, async () => {
      //   await dropTestDB(clusterName, namespace);
      // });

      test(`Delete schedules [${db} size ${size}]`, async ({ page }) => {
        test.setTimeout(30 * 1000);

        await gotoDbClusterBackups(page, clusterName);

        await test.step('Delete first schedule', async () => {
          await page.getByTestId('scheduled-backups').click();

          const scheduleForDeleteBtn = await page
            .getByTestId('delete-schedule-button')
            .first();
          await scheduleForDeleteBtn.click();
          await page.getByTestId('confirm-dialog-delete').click();
          expect(page.getByText('1 active schedule')).toBeTruthy();
        });

        await test.step('Delete second schedule', async () => {
          await page.reload();
          await page.getByTestId('scheduled-backups').click();
          const scheduleForDeleteBtn2 = await page
            .getByTestId('delete-schedule-button')
            .first();
          await scheduleForDeleteBtn2.click();
          await page.getByTestId('confirm-dialog-delete').click();
          await expect(page.getByText('1 active schedule')).toBeHidden({
            timeout: 5000,
          });
        });
      });

      test(`Restore cluster [${db} size ${size}]`, async ({ page }) => {
        await gotoDbClusterBackups(page, clusterName);
        const firstBackup = await page
          .getByText(`${db}-${size}-schbkp-`)
          .first()
          .textContent();

        await findRowAndClickActions(page, firstBackup, 'Create New DB');
        await expect(
          page.getByTestId('select-input-backup-name')
        ).not.toBeEmpty();
        await page.getByTestId('form-dialog-create').click();

        await page.waitForURL('**/databases/new');

        restoredClusterName = clusterName + '-restored';
        if (db === 'psmdb') {
          restoredClusterName = clusterName + '-restore';
        }

        // Set the new DB name
        await expect(page.getByTestId('text-input-db-name')).toBeVisible();
        await page.getByTestId('text-input-db-name').fill(restoredClusterName);


        // Click "Continue" 4 times
        for (let i = 0; i < 4; i++) {
          await expect(page.getByTestId('db-wizard-continue-button')).toBeVisible();
          await page.getByTestId('db-wizard-continue-button').click();
        }
        // Click "Create Database"
        await expect(page.getByTestId('db-wizard-submit-button')).toBeVisible();
        await page.getByTestId('db-wizard-submit-button').click();

        await test.step('Check restored DB list and status', async () => {
        
          // Wait for the new restored cluster to initialize
          await waitForStatus(page, restoredClusterName, 'Initializing', 15000);
        
          // Wait for the restored cluster to reach "Up" status
          await waitForStatus(page, restoredClusterName, 'Up', 600000);
        });
      });

      test(`Delete original DB cluster after restore [${db} size ${size}]`, async ({ page }) => {
        // await test.step('Ensure restored cluster is present before deletion', async () => {
        //   await page.goto('/databases');
        //   await expect(page.getByText(restoredClusterName)).toBeVisible({
        //     timeout: 60000, // Ensure the restored cluster appears before deleting the original
        //   });
        // });
      
        await test.step('Delete original cluster', async () => {
          await deleteDbCluster(page, clusterName);
        });
      
        // await test.step('Verify cluster is in "Deleting" state', async () => {
        //   await waitForStatus(page, clusterName, 'Deleting', 15000);
        // });
      
        // await test.step('Wait for cluster deletion to complete', async () => {
        //   await waitForDelete(page, clusterName, 240000);
        // });
      
        // await test.step('Confirm original cluster is deleted', async () => {
        //   await expect(page.getByText(clusterName)).toBeHidden({
        //     timeout: 15000,
        //   });
        // });
      });


      test(`Check data after restore [${db} size ${size}]`, async () => {
        //For debugging only
        //console.log(`Querying restored cluster: ${restoredClusterName}`);
      
        const result = await queryTestDB(restoredClusterName, namespace);
      
        switch (db) {
          case 'pxc':
            expect(result.trim()).toBe('1\n2\n3');
            break;
          case 'psmdb':
            // Normalize JSON format before comparison
            const parsedResult = JSON.stringify(JSON.parse(result.trim()));
            const expectedJson = JSON.stringify([{ a: 1 }, { a: 2 }, { a: 3 }]);
            expect(parsedResult).toBe(expectedJson);
            break;
          case 'postgresql':
            expect(result.trim()).toBe('1\n 2\n 3');
            break;
        }
      });
      
      test(`Verify and Delete Restore History [${db} size ${size}]`, async ({ page }) => {
        await gotoDbClusterRestores(page, restoredClusterName);
        await test.step('Verify restore history exists', async () => {
            await expect(page.getByTestId('status')).toHaveText('Succeeded');
        });
        await test.step('Delete the restore entry', async () => {
            await findRowAndClickActions(page, restoredClusterName, 'Delete');
            await expect(page.getByLabel('Delete restore')).toBeVisible();
            await page.getByTestId('confirm-dialog-delete').click();
        });

        // REWORK
        // await test.step('Verify restore entry is deleted', async () => {
        //     await waitForDelete(page, restoredClusterName, 15000);
        // });
      });

      // test.only(`Create and verify Scheduled Backup [${db} size ${size}]`, async ({ page }) => {
      //   const scheduleMinute = getNextScheduleMinute(2);
      //   const timeOption: ScheduleTimeOptions = {
      //     frequency: 'hour',
      //     day: null,
      //     amPm: null,
      //     hour: null,
      //     minute: scheduleMinute,
      //   };
      //   console.log(`Navigating to backups for cluster: ${restoredClusterName}`);
      
      //   await test.step('Navigate to Backups tab', async () => {
      //     await gotoDbClusterBackups(page, restoredClusterName);
      //   });
      
      //   await test.step('Click Create Backup and select Schedule', async () => {
      //     await page.getByTestId('menu-button').click();
      //     await page.getByTestId('schedule-menu-item').click();
      //     await fillScheduleModalForm(page, timeOption, 'scheduled-backup', false, '0');
      //     await page.getByTestId('form-dialog-create').click();
      //   });
      
      //   await test.step('Verify scheduled backup entry appears', async () => {
      //     // Check if the schedule entry is visible, else open the dropdown and check again
      //     if (!(await page.getByText(`Every hour at minute ${scheduleMinute}`).isVisible())) {
      //       await page.getByTestId('scheduled-backups').click();
      //     }
      //     await expect(page.getByText(`Every hour at minute ${scheduleMinute}`)).toBeVisible();
      //     await expect(page.getByText('1 active schedule')).toBeVisible();
      //   });
      
      //   await test.step('Verify scheduled backup succeeds', async () => {
      //     await expect(page.getByText(`${db}-${size}-schbkp-restore-`)).toBeVisible({
      //       timeout: 60000, // 60 seconds max to appear
      //     });
      
      //     await expect(page.getByText('Succeeded')).toBeVisible({
      //       timeout: 360000, // 6 minutes max to succeed
      //     });
      //   });
      // });      
      
      
      // test.only(`Create and verify on-demand backup [${db} size ${size}]`, async ({ page }) => {
      //   await test.step('Navigate to Backups tab', async () => {
      //     await gotoDbClusterBackups(page, restoredClusterName);
      //   });
      
      //   await test.step('Click Create Backup and select NOW', async () => {
      //     await page.getByTestId('menu-button').click();
      //     await page.getByTestId('now-menu-item').click();
      //     await page.getByTestId('form-dialog-create').click();
      //   });
      
      //   await test.step('Verify NOW backup appears and succeeds', async () => {
      //     await expect(page.getByText(`${db}-${size}-schbkp-restore-`)).toBeVisible({
      //       timeout: 60000, // 60 seconds max to appear
      //     });
      
      //     await expect(page.getByText('Succeeded')).toBeVisible({
      //       timeout: 360000, // 6 minutes max to succeed
      //     });
      //   });
      // });

      // test(`Delete schedules [${db} size ${size}]`, async ({ page }) => {
      //   test.setTimeout(30 * 1000);
    
      //   await gotoDbClusterBackups(page, restoredClusterName);
    
      //   await test.step('Delete the schedule', async () => {
      //       await page.getByTestId('scheduled-backups').click();
    
      //       const scheduleForDeleteBtn = await page
      //           .getByTestId('delete-schedule-button')
      //           .first();
      //       await scheduleForDeleteBtn.click();
      //       await page.getByTestId('confirm-dialog-delete').click();
    
      //       await expect(page.getByText('1 active schedule')).toBeHidden({
      //           timeout: 5000,
      //     });
      //   });
      // });

      // test(`Delete backups [${db} size ${size}]`, async ({ page }) => {
      //   test.setTimeout(60 * 1000); // Increased timeout for safety
  
      //   await gotoDbClusterBackups(page, restoredClusterName);
  
      //   const deleteBackup = async () => {
      //       const backupName = await page
      //           .getByText(`${db}-${size}-schbkp-`)
      //           .first()
      //           .textContent();
  
      //       await findRowAndClickActions(page, backupName, 'Delete');
      //       await expect(page.getByLabel('Delete backup')).toBeVisible();
      //       await page.getByTestId('form-dialog-delete').click();
      //       await waitForDelete(page, backupName, 30000);
      //   };
  
      //   await test.step('Delete first backup', async () => {
      //       await deleteBackup();
      //   });
  
      //   await test.step('Delete second backup', async () => {
      //       await deleteBackup();
      //   });
      // });

      test(`Delete cluster [${db} size ${size}]`, async ({ page }) => {
        console.log(`Querying restored cluster: ${restoredClusterName}`);
        await deleteDbCluster(page, restoredClusterName);
        await waitForStatus(page, restoredClusterName, 'Deleting', 15000);
        await waitForDelete(page, restoredClusterName, 240000);
      });  
    }
  );
});
