import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getNamespacesFn } from '@e2e/utils/namespaces';
import {
  restoreOldRBACPermissions,
  saveOldRBACPermissions,
  setRBACPermissions,
} from '@e2e/utils/rbac-cmd-line';
import { expect, test } from '@playwright/test';
import {
  MOCK_CLUSTER_NAME,
  mockBackups,
  mockCluster,
  mockClusters,
} from './utils';

const { CI_USER: user } = process.env;

test.describe('Restores RBAC', () => {
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

  test('Restore to same DB', async ({ page }) => {
    await setRBACPermissions(user, [
      ['namespaces', 'read', namespace],
      ['database-engines', 'read', `${namespace}/*`],
      ['backup-storages', 'read', `${namespace}/*`],
      ['database-clusters', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
      ['database-cluster-backups', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
      ['database-cluster-restores', 'create', `${namespace}/*`],
      [
        'database-cluster-credentials',
        'read',
        `${namespace}/${MOCK_CLUSTER_NAME}`,
      ],
    ]);
    await mockCluster(page, namespace);
    await mockClusters(page, namespace);
    await mockBackups(page, namespace);
    await page.goto('/databases');
    await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
    await page.getByTestId('actions-menu-button').click();
    await expect(page.getByText('Restore from a backup')).toBeVisible();
  });

  test('Create DB from backup', async ({ page }) => {
    await setRBACPermissions(user, [
      ['namespaces', 'read', namespace],
      ['database-engines', 'read', `${namespace}/*`],
      ['database-clusters', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
      ['database-clusters', 'create', `${namespace}/*`],
      ['backup-storages', 'read', `${namespace}/*`],
      ['database-cluster-backups', '*', `${namespace}/${MOCK_CLUSTER_NAME}`],
      ['database-cluster-restores', 'create', `${namespace}/*`],
      [
        'database-cluster-credentials',
        'read',
        `${namespace}/${MOCK_CLUSTER_NAME}`,
      ],
    ]);
    await mockCluster(page, namespace);
    await mockClusters(page, namespace);
    await mockBackups(page, namespace);
    await page.goto('/databases');
    await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
    await page.getByTestId('actions-menu-button').click();
    await expect(page.getByText('Create DB from a backup')).toBeVisible();
  });

  [
    {
      permissionToRemove: 'database-cluster-credentials',
    },
    {
      permissionToRemove: 'database-cluster-restores',
    },
  ].forEach(({ permissionToRemove }) => {
    test(`Hide Restore to same DB if "${permissionToRemove}" permission is removed`, async ({
      page,
    }) => {
      await setRBACPermissions(
        user,
        //@ts-expect-error
        [
          ['namespaces', 'read', namespace],
          ['database-engines', 'read', `${namespace}/*`],
          ['backup-storages', 'read', `${namespace}/*`],
          ['database-clusters', '*', `${namespace}/${MOCK_CLUSTER_NAME}`],
          [
            'database-cluster-backups',
            'read',
            `${namespace}/${MOCK_CLUSTER_NAME}`,
          ],
          ['database-cluster-restores', 'create', `${namespace}/*`],
          [
            'database-cluster-credentials',
            'read',
            `${namespace}/${MOCK_CLUSTER_NAME}`,
          ],
        ].filter(([permission]) => permission !== permissionToRemove)
      );
      await mockCluster(page, namespace);
      await mockClusters(page, namespace);
      await mockBackups(page, namespace);
      await page.goto('/databases');
      await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
      await page.getByTestId('actions-menu-button').click();
      await expect(page.getByText('Restore from a backup')).not.toBeVisible();
    });
  });

  [
    {
      permissionToRemove: 'database-cluster-credentials',
    },
    {
      permissionToRemove: 'database-cluster-restores',
    },
    {
      permissionToRemove: 'database-cluster-backups',
    },
  ].forEach(({ permissionToRemove }) => {
    test(`Hide Create DB from backup if "${permissionToRemove}" permission is removed`, async ({
      page,
    }) => {
      await setRBACPermissions(
        user,
        //@ts-expect-error
        [
          ['namespaces', 'read', namespace],
          ['database-engines', 'read', `${namespace}/*`],
          ['database-clusters', '*', `${namespace}/${MOCK_CLUSTER_NAME}`],
          ['database-clusters', 'create', `${namespace}/*`],
          ['backup-storages', 'read', `${namespace}/*`],
          [
            'database-cluster-backups',
            '*',
            `${namespace}/${MOCK_CLUSTER_NAME}`,
          ],
          ['database-cluster-restores', 'create', `${namespace}/*`],
          [
            'database-cluster-credentials',
            'read',
            `${namespace}/${MOCK_CLUSTER_NAME}`,
          ],
        ].filter(([permission]) => permission !== permissionToRemove)
      );
      await mockCluster(page, namespace);
      await mockClusters(page, namespace);
      await mockBackups(page, namespace);
      await page.goto('/databases');
      await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
      await page.getByTestId('actions-menu-button').click();
      await expect(page.getByText('Create DB from a backup')).not.toBeVisible();
    });
  });
});
