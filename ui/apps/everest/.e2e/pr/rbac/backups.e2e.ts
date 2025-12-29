import { setRBACRoleWithPermissionsK8s } from '@e2e/utils/rbac-cmd-line';
import { loginTestUser, RBACTestUser } from '@e2e/utils/user';
import { expect, Page, test } from '@playwright/test';
import {
  MOCK_CLUSTER_NAME,
  mockBackups,
  mockClusters,
  mockStorages,
  RBACTestWrapper,
} from './utils';
import { TIMEOUTS } from '@e2e/constants';

test.describe.parallel('Backups RBAC', () => {
  test.describe.configure({ timeout: TIMEOUTS.OneMinute });

  test('Hide Backups', async ({ browser }) => {
    const userName = 'hide-backups';
    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', '*', `${namespace}/*`],
        ['backup-storages', '*', `${namespace}/*`],
        ['database-clusters', '*', `${namespace}/*`],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace);
      await mockBackups(page, namespace);
      await mockStorages(page, namespace);
      await page.goto(`/databases/${namespace}/${MOCK_CLUSTER_NAME}/backups`);

      // Without backup read permission, the page should show an empty state or no table rows
      const table = page.getByRole('table');
      const tableExists = await table.count() > 0;

      if (tableExists) {
        const rows = page.locator('.MuiTableRow-root:not(.MuiTableRow-head)');
        expect(await rows.count()).toBe(0);
      } else {
        // Table doesn't exist, which is also acceptable for no permissions
        await expect(page.getByText(/no.*backup|empty/i)).toBeVisible();
      }
    });
  });

  test('Show Backups', async ({ browser }) => {

    const userName = 'show-backups';
    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', '*', `${namespace}/*`],
        ['backup-storages', '*', `${namespace}/*`],
        ['database-clusters', '*', `${namespace}/*`],
        ['database-cluster-backups', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace);
      await mockBackups(page, namespace);
      await mockStorages(page, namespace);

      await page.goto(`/databases/${namespace}/${MOCK_CLUSTER_NAME}/backups`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByTestId('row-actions-menu-button')).not.toBeVisible();
      const rows = page.locator('.MuiTableRow-root:not(.MuiTableRow-head)');
      expect(await rows.count()).toBe(1);
    });
  });

  test('Delete backup', async ({ browser }) => {
    const userName = 'delete-backup';
    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', '*', `${namespace}/*`],
        ['backup-storages', '*', `${namespace}/*`],
        ['database-clusters', '*', `${namespace}/*`],
        ['database-cluster-backups', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
        [
          'database-cluster-backups',
          'delete',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace);
      await mockBackups(page, namespace);
      await mockStorages(page, namespace);

      await page.goto(`/databases/${namespace}/${MOCK_CLUSTER_NAME}/backups`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('row-actions-menu-button')).toBeVisible();
      await page.getByTestId('row-actions-menu-button').click();
      await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Restore to this DB' })).not.toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Create new DB' })).not.toBeVisible();
    });
  });

  test('Create on-demand backup', async ({ browser }) => {
    const userName = 'create-ondemand-backup';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', '*', `${namespace}/*`],
        ['backup-storages', '*', `${namespace}/*`],
        ['database-clusters', 'read', `${namespace}/*`],
        [
          'database-cluster-backups',
          'create',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace);
      await mockBackups(page, namespace);
      await mockStorages(page, namespace);

      await page.goto(`/databases/${namespace}/${MOCK_CLUSTER_NAME}/backups`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('menu-button')).toBeVisible();
      await page.getByText('Create backup').click();
      await expect(page.getByText('Now', { exact: true })).toBeVisible();
      await expect(page.getByText('Schedule', { exact: true })).not.toBeVisible();
    })
  });

  test('Create scheduled backup', async ({ browser }) => {
    const userName = 'create-scheduled-backup';
    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', '*', `${namespace}/*`],
        ['backup-storages', '*', `${namespace}/*`],
        ['database-clusters', 'read', `${namespace}/*`],
        ['database-clusters', 'update', `${namespace}/*`],
        [
          'database-cluster-backups',
          'create',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace);
      await mockBackups(page, namespace);
      await mockStorages(page, namespace);

      await page.goto(`/databases/${namespace}/${MOCK_CLUSTER_NAME}/backups`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('menu-button')).toBeVisible();
      await page.getByText('Create backup').click();
      await expect(page.getByText('Schedule', { exact: true })).toBeVisible();
    });
  });
});
