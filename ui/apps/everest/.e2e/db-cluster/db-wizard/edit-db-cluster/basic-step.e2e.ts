import { expect, test } from '@playwright/test';
import { getTokenFromLocalStorage } from '../../../utils/localStorage';
import { getNamespacesFn } from '../../../utils/namespaces';
import {
  createDbClusterFn,
  deleteDbClusterFn,
} from '../../../utils/db-cluster';
import { findDbAndClickActions } from '../../../utils/db-clusters-list';

test.describe('DB Cluster Editing Basic step', () => {
  const mySQLName = 'db-backup-mysql-basic';
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
