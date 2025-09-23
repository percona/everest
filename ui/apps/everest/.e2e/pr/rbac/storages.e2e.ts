import { getCITokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getNamespacesFn } from '@e2e/utils/namespaces';
import { setRBACPermissionsK8S } from '@e2e/utils/rbac-cmd-line';
import { expect, test } from '@playwright/test';
import { MOCK_STORAGE_NAME, mockStorages } from './utils';

const { CI_USER: user } = process.env;

test.describe('Backup Storages RBAC', () => {
  let namespace = '';
  test.beforeAll(async ({ request }) => {
    await setRBACPermissionsK8S([['namespaces', 'read', '*']]);
    const token = await getCITokenFromLocalStorage();
    const namespaces = await getNamespacesFn(token, request);
    namespace = namespaces[0];
  });

  test('Show Backup Storages', async ({ page }) => {
    await setRBACPermissionsK8S([
      ['namespaces', 'read', namespace],
      ['backup-storages', 'read', `${namespace}/${MOCK_STORAGE_NAME}`],
    ]);
    await mockStorages(page, namespace);
    await page.goto('/settings/storage-locations');
    await expect(page.getByText(MOCK_STORAGE_NAME)).toBeVisible();
    await expect(page.getByTestId('add-backup-storage')).not.toBeVisible();
  });

  test('Hide Backup Storages when no namespaces allowed', async ({ page }) => {
    await setRBACPermissionsK8S([
      ['backup-storages', 'read', `${namespace}/${MOCK_STORAGE_NAME}`],
    ]);
    await mockStorages(page, namespace);
    await page.goto('/settings/storage-locations');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText(MOCK_STORAGE_NAME)).not.toBeVisible();
  });

  test('Hide Backup Storages when no storage allowed', async ({ page }) => {
    await setRBACPermissionsK8S([['namespaces', 'read', namespace]]);
    await mockStorages(page, namespace);
    await page.goto('/settings/storage-locations');
    await expect(page.getByText(MOCK_STORAGE_NAME)).not.toBeVisible();
  });

  test('Create Backup Storages', async ({ page }) => {
    await setRBACPermissionsK8S([
      ['namespaces', 'read', namespace],
      ['backup-storages', 'read', `${namespace}/${MOCK_STORAGE_NAME}`],
      ['backup-storages', 'create', `${namespace}/*`],
    ]);
    await mockStorages(page, namespace);
    await page.goto('/settings/storage-locations');
    await expect(page.getByText(MOCK_STORAGE_NAME)).toBeVisible();
    await expect(page.getByTestId('add-backup-storage')).toBeVisible();
  });

  test('Hide create Backup Storages button when no namespace available', async ({
    page,
  }) => {
    await setRBACPermissionsK8S([
      ['backup-storages', 'read', `${namespace}/${MOCK_STORAGE_NAME}`],
      ['backup-storages', 'create', `${namespace}/*`],
    ]);
    await mockStorages(page, namespace);
    await page.goto('/settings/storage-locations');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByTestId('add-backup-storage')).not.toBeVisible();
  });
});
