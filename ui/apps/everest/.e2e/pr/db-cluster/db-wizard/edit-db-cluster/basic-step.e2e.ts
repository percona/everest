import { expect, test } from '@playwright/test';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { createDbClusterFn, deleteDbClusterFn } from '@e2e/utils/db-cluster';
import { findDbAndClickActions } from '@e2e/utils/db-clusters-list';

test.describe('DB Cluster Editing Basic step', () => {
  const mySQLName = 'db-backup-mysql-basic';

  test.beforeAll(async ({ request }) => {
    await createDbClusterFn(request, {
      dbName: mySQLName,
      dbType: 'mysql',
      numberOfNodes: '1',
    });
  });

  test.afterAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    await deleteDbClusterFn(request, mySQLName);
  });

  test('DB versions dropdown correctly filled when editing', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickActions(page, mySQLName, 'Edit');

    expect(
      await page.getByTestId('select-input-db-version').inputValue
    ).toBeDefined();
  });

  test('Namespaces dropdown should be disabled in edit mode', async ({
    page,
  }) => {
    await page.goto('/databases');
    await findDbAndClickActions(page, mySQLName, 'Edit');

    await expect(page.getByTestId('text-input-k8s-namespace')).toBeDisabled();
  });
});
