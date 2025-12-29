import { getCITokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getNamespacesFn } from '@e2e/utils/namespaces';
import { setRBACPermissionsK8S, setRBACRoleWithPermissionsK8s } from '@e2e/utils/rbac-cmd-line';
import { expect, test } from '@playwright/test';
import { MOCK_STORAGE_NAME, mockStorages, RBACTestWrapper } from './utils';
import { aw } from 'vitest/dist/chunks/reporters.nr4dxCkA';
import { loginTestUser } from '@e2e/utils/user';
import { TIMEOUTS } from '@e2e/constants';

const { CI_USER: user } = process.env;

test.describe('Backup Storages RBAC', () => {
  test.describe.configure({ timeout: TIMEOUTS.OneMinute });

  test('Show Backup Storages', async ({ browser }) => {
    const userName = 'show-backup-storages';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['backup-storages', 'read', `${namespace}/${MOCK_STORAGE_NAME}`],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockStorages(page, namespace);

      await page.goto('/settings/storage-locations');
      await expect(page.getByText(MOCK_STORAGE_NAME)).toBeVisible();
      await expect(page.getByTestId('add-backup-storage')).not.toBeVisible();
    });
  });

  test('Hide Backup Storages when no namespaces allowed', async ({ browser }) => {
    const userName = 'hide-backup-storages-no-ns';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['backup-storages', 'read', `${namespace}/${MOCK_STORAGE_NAME}`],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockStorages(page, namespace);

      await page.goto('/settings/storage-locations');
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByText(MOCK_STORAGE_NAME)).not.toBeVisible();
    });
  });

  test('Hide Backup Storages when no storage allowed', async ({ browser }) => {
    const userName = 'hide-backup-storages-no-storage';
    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockStorages(page, namespace);
      await page.goto('/settings/storage-locations');
      await expect(page.getByText(MOCK_STORAGE_NAME)).not.toBeVisible();
    });
  });

  test('Create Backup Storages', async ({ page }) => {
    const userName = 'create-backup-storages';

    await RBACTestWrapper(page.context().browser(), userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['backup-storages', 'read', `${namespace}/${MOCK_STORAGE_NAME}`],
        ['backup-storages', 'create', `${namespace}/*`],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockStorages(page, namespace);

      await page.goto('/settings/storage-locations');
      await expect(page.getByText(MOCK_STORAGE_NAME)).toBeVisible();
      await expect(page.getByTestId('add-backup-storage')).toBeVisible();
    });
  });

  test('Hide create Backup Storages button when no namespace available', async ({
    browser
  }) => {
    const userName = 'hide-create-backup-storages-no-ns';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['backup-storages', 'read', `${namespace}/${MOCK_STORAGE_NAME}`],
        ['backup-storages', 'create', `${namespace}/*`],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockStorages(page, namespace);
      await page.goto('/settings/storage-locations');
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByTestId('add-backup-storage')).not.toBeVisible();
    });
  });
});
