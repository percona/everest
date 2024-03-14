import { test, expect } from '@playwright/test';
import { createDbClusterFn, deleteDbClusterFn } from '../utils/db-cluster';

test.describe('DB Cluster Overview', async () => {
  const dbClusterName = 'cluster-overview-test';

  test.beforeAll(async ({ request }) => {
    await createDbClusterFn(request, {
      dbName: dbClusterName,
      dbType: 'mysql',
      numberOfNodes: '1',
      cpu: 0.6,
      disk: 1,
      memory: 1,
      externalAccess: true,
      sourceRanges: [
        {
          sourceRange: 'http://192.168.1.1',
        },
      ],
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
  });

  test.afterAll(async ({ request }) => {
    await deleteDbClusterFn(request, dbClusterName);
  });

  test('Overview information', async ({ page }) => {
    const row = await page.getByText(dbClusterName);

    await row.click();

    await expect(
      page.getByRole('heading', {
        name: dbClusterName,
      })
    ).toBeVisible();

    await expect(page.getByText('Type: MySQL')).toBeVisible();
    await expect(page.getByText(`Name: ${dbClusterName}`)).toBeVisible();
    await expect(page.getByText('Number of nodes: 1')).toBeVisible();
    await expect(
      page.getByText('CPU: 600m').or(page.getByText('CPU: 0.6'))
    ).toBeVisible();
    await expect(page.getByText('Disk: 1G')).toBeVisible();
    await expect(page.getByText('Memory: 1G')).toBeVisible();

    await expect(
      page
        .getByTestId('overview-section')
        .filter({
          hasText: 'External Access',
        })
        .getByText('Enabled')
    ).toBeVisible();
  });

  test('Delete Action', async ({ page, request }) => {
    const dbName = 'delete-test';

    await createDbClusterFn(request, {
      dbName: dbName,
      dbType: 'mysql',
      numberOfNodes: '1',
    });

    const row = page.getByText(dbName);
    await row.click();

    await expect(
      page.getByRole('heading', {
        name: dbName,
      })
    ).toBeVisible();

    const actionButton = page.getByTestId('actions-button');
    await actionButton.click();

    const deleteButton = page.getByTestId(`${dbName}-delete`);
    await deleteButton.click();

    await page.getByTestId(`${dbName}-form-dialog`).waitFor();
    await expect(page.getByTestId('irreversible-action-alert')).toBeVisible();
    const deleteConfirmationButton = page
      .getByRole('button')
      .filter({ hasText: 'Delete' });
    await expect(deleteConfirmationButton).toBeDisabled();
    await page.getByTestId('text-input-confirm-input').fill(dbName);
    await expect(deleteConfirmationButton).toBeEnabled();
    await deleteConfirmationButton.click();
  });
});
