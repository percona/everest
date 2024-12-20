import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getNamespacesFn } from '@e2e/utils/namespaces';
import {
  saveOldRBACPermissions,
  restoreOldRBACPermissions,
  setRBACPermissions,
} from '@e2e/utils/rbac-cmd-line';
import { expect, test } from '@playwright/test';
import { selectDbEngine } from '../db-cluster/db-wizard/db-wizard-utils';
import { moveForward } from '@e2e/utils/db-wizard';
import { mockCluster, mockClusters, mockEngines, mockStorages } from './utils';

const { CI_USER: user } = process.env;

test.describe('Schedules RBAC', () => {
  let namespace = '';
  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    await saveOldRBACPermissions();
    const namespaces = await getNamespacesFn(token, request);
    namespace = namespaces[0];
  });

  test.afterAll(async () => {
    await restoreOldRBACPermissions();
  });

  test('Schedule creation from wizard', async ({ page }) => {
    await setRBACPermissions(user, [
      ['namespaces', 'read', namespace],
      ['database-engines', '*', `${namespace}/*`],
      ['database-clusters', 'read', `${namespace}/*`],
      ['database-clusters', 'create', `${namespace}/*`],
      ['backup-storages', 'read', `${namespace}/*`],
      ['database-cluster-backups', 'create', `${namespace}/*`],
    ]);
    await mockEngines(page, namespace);
    await mockStorages(page, namespace);
    await mockClusters(page, namespace);
    await mockCluster(page, namespace);
    await page.goto('/databases');
    await page.getByTestId('add-db-cluster-button').click();
    await expect(
      page.getByText('Basic information', { exact: true })
    ).toBeVisible();
    await moveForward(page);
    await moveForward(page);
    await expect(
      page.getByRole('button').filter({ hasText: 'Create backup schedule' })
    ).toBeVisible();
  });

  test('Hide schedule button from wizard when not allowed to create backups', async ({
    page,
  }) => {
    await setRBACPermissions(user, [
      ['namespaces', 'read', namespace],
      ['database-engines', '*', `${namespace}/*`],
      ['database-clusters', 'read', `${namespace}/*`],
      ['database-clusters', 'create', `${namespace}/*`],
      ['backup-storages', 'read', `${namespace}/*`],
    ]);
    await mockEngines(page, namespace);
    await mockStorages(page, namespace);
    await mockClusters(page, namespace);
    await mockCluster(page, namespace);
    await page.goto('/databases');
    await page.getByTestId('add-db-cluster-button').click();
    await expect(
      page.getByText('Basic information', { exact: true })
    ).toBeVisible();
    await moveForward(page);
    await moveForward(page);
    await expect(
      page.getByRole('button').filter({ hasText: 'Create backup schedule' })
    ).not.toBeVisible();
  });

  test('Hide schedule button from wizard when not allowed to read storages', async ({
    page,
  }) => {
    await setRBACPermissions(user, [
      ['namespaces', 'read', namespace],
      ['database-engines', '*', `${namespace}/*`],
      ['database-clusters', 'read', `${namespace}/*`],
      ['database-clusters', 'create', `${namespace}/*`],
      ['database-cluster-backups', 'create', `${namespace}/*`],
    ]);
    await mockEngines(page, namespace);
    await mockStorages(page, namespace);
    await mockClusters(page, namespace);
    await mockCluster(page, namespace);
    await page.goto('/databases');
    await page.getByTestId('add-db-cluster-button').click();
    await expect(
      page.getByText('Basic information', { exact: true })
    ).toBeVisible();
    await moveForward(page);
    await moveForward(page);
    await expect(
      page.getByRole('button').filter({ hasText: 'Create backup schedule' })
    ).not.toBeVisible();
  });
});
