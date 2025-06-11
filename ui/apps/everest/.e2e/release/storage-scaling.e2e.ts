import { expect, test } from '@playwright/test';
import { deleteDbCluster } from '@e2e/utils/db-clusters-list';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import {
  moveForward,
  submitWizard,
  populateBasicInformation,
  populateResources,
  populateAdvancedConfig,
} from '@e2e/utils/db-wizard';
import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import { waitForStatus, waitForDelete } from '@e2e/utils/table';

let token: string;

const dbs = [
  { db: 'psmdb', size: 3 },
  { db: 'pxc', size: 3 },
  { db: 'postgresql', size: 3 },
];
const namespaces = EVEREST_CI_NAMESPACES;

test.describe.configure({ retries: 0 });

dbs.forEach(({ db, size }) => {
  const clusterName = `${db}-storage-scaling`;

  test.describe(
    'Storage Scaling E2E Tests',
    {
      tag: '@release',
    },
    () => {
      let storageClasses = [];

      test.beforeAll(async ({ request }) => {
        token = await getTokenFromLocalStorage();

        const { storageClassNames = [] } = await getClusterDetailedInfo(
          token,
          request
        );
        storageClasses = storageClassNames;
      });

      test(`Cluster creation [${db}]`, async ({ page, request }) => {
        expect(storageClasses.length).toBeGreaterThan(0);

        await page.goto('/databases');
        await page.getByTestId('add-db-cluster-button').waitFor();
        await page.getByTestId('add-db-cluster-button').click();
        await page.getByTestId(`add-db-cluster-button-${db}`).click();

        await test.step('Populate basic information', async () => {
          await populateBasicInformation(
            page,
            namespaces[`${db.toUpperCase()}_ONLY`],
            clusterName,
            db,
            storageClasses[0],
            false,
            null
          );
          await moveForward(page);
        });

        await test.step('Populate resources', async () => {
          await populateResources(page, 0.6, 1, 1, size);
          await moveForward(page);
        });

        await test.step('Populate backups', async () => {
          await moveForward(page);
        });

        await test.step('Populate advanced db config', async () => {
          await populateAdvancedConfig(page, db, true, '', false, '');
          await moveForward(page);
        });

        await test.step('Submit wizard', async () => {
          await submitWizard(page);
        });

        // Go to DB list and check status
        await test.step('Check db list and status', async () => {
          await page.goto('/databases');
          await waitForStatus(page, clusterName, 'Initializing', 30000);
          await waitForStatus(page, clusterName, 'Up', 600000);
        });
      });

      test(`Validate storage scaling [${db}]`, async ({ page }) => {
        await page.goto('/databases');
        await page.getByTestId(`db-cluster-${clusterName}`).click();
        await page.getByTestId('edit-resources-button').click();

        await test.step('Attempt to decrease disk size', async () => {
          const diskInput = page.getByTestId('text-input-disk');
          const saveButton = page.getByTestId('form-dialog-save');

          // Ensure the initial value is correct
          await expect(diskInput).toHaveValue(/1(\.0)?/);

          // Attempt to decrease the disk size
          await diskInput.fill('0.5');

          // Verify that the save button is disabled
          await expect(saveButton).toBeDisabled();

          // Verify that the error message is displayed
          await expect(
            page.locator('text=Descaling is not allowed')
          ).toBeVisible();
        });

        await test.step('Increase disk size', async () => {
          const diskInput = page.getByTestId('text-input-disk');
          const saveButton = page.getByTestId('form-dialog-save');

          // Increase the disk size
          await diskInput.fill('2');

          // Verify that the warning message is displayed
          await expect(
            page.locator(
              'text=Disk upscaling is irreversible and may temporarily block further resize actions until complete.'
            )
          ).toBeVisible();

          // Verify that the save button is enabled
          await expect(saveButton).toBeEnabled();

          // Save the changes
          await saveButton.click();

          // Verify that the modal is closed
          await expect(
            page.locator('[data-testid="resources-edit-modal"]')
          ).toBeHidden();

          // Check DB status to be Up
          await waitForStatus(page, clusterName, 'Up', 600000);
        });
      });

      test(`Delete cluster [${db}]`, async ({ page }) => {
        await deleteDbCluster(page, clusterName);
        await waitForStatus(page, clusterName, 'Deleting', 15000);
        await waitForDelete(page, clusterName, 240000);
      });
    }
  );
});
