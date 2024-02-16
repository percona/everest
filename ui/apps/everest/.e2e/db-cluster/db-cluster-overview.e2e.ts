import { test, expect } from '@playwright/test';
import { createDbClusterFn, deleteDbClusterFn } from '../utils/db-cluster';
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { getNamespacesFn } from '../utils/namespaces';

test.describe('DB Cluster Overview', async () => {
  const dbClusterName = 'cluster-overview-test';
  let namespace = '';

  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    const namespaces = await getNamespacesFn(token, request);
    namespace = namespaces[0];
    await createDbClusterFn(token, request, namespaces[0], {
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
    const token = await getTokenFromLocalStorage();
    await deleteDbClusterFn(token, request, dbClusterName, namespace);
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
});
