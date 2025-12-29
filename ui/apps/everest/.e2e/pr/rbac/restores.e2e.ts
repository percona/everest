import { setRBACPermissionsK8S, setRBACRoleWithPermissionsK8s } from '@e2e/utils/rbac-cmd-line';
import { expect, test } from '@playwright/test';
import { MOCK_CLUSTER_NAME, mockBackups, mockClusters, RBACTestWrapper } from './utils';
import { loginTestUser } from '@e2e/utils/user';
import { a } from 'vitest/dist/chunks/suite.B2jumIFP';
import { TIMEOUTS } from '@e2e/constants';

test.describe.parallel('Restores RBAC', () => {
  test.describe.configure({ timeout: TIMEOUTS.OneMinute });

  test('Restore to same DB', async ({ browser }) => {
    const userName = 'restore-to-same-db';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
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
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace);
      await mockBackups(page, namespace);

      await page.goto('/databases');
      await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
      await page.getByTestId('actions-menu-button').click();
      await expect(page.getByText('Restore from a backup')).toBeVisible();
    });
  });

  test('Create DB from backup', async ({ browser }) => {
    const userName = 'create-db-from-backup';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', 'read', `${namespace}/*`],
        ['database-clusters', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['database-clusters', 'create', `${namespace}/*`],
        ['backup-storages', 'read', `${namespace}/*`],
        ['database-cluster-backups', '*', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['monitoring-instances', '*', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['database-cluster-restores', 'create', `${namespace}/*`],
        [
          'database-cluster-credentials',
          'read',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace);
      await mockBackups(page, namespace);

      await page.goto('/databases');
      await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
      await page.getByTestId('actions-menu-button').click();
      await expect(page.getByText('Create DB from a backup')).toBeVisible();
    })
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
      browser,
    }) => {
      const userName = `hide-restore-to-same-db-no-${permissionToRemove}`;

      await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {

        await setRBACRoleWithPermissionsK8s(`role:${userName}`,
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
          ].filter(([permission]) => permission !== permissionToRemove),
          testUser.username);
        await loginTestUser(page, testUser.username, testUser.password);

        await mockClusters(page, namespace);
        await mockBackups(page, namespace);

        await page.goto('/databases');
        await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
        await page.getByTestId('actions-menu-button').click();
        await expect(page.getByText('Restore from a backup')).not.toBeVisible();
      })
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
      browser,
    }) => {
      const userName = `hide-create-db-from-backup-no-${permissionToRemove}`;
      await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
        await setRBACRoleWithPermissionsK8s(`role:${userName}`,
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
          ].filter(([permission]) => permission !== permissionToRemove), testUser.username);
        await loginTestUser(page, testUser.username, testUser.password);

        await mockClusters(page, namespace);
        await mockBackups(page, namespace);

        await page.goto('/databases');
        await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
        await page.getByTestId('actions-menu-button').click();
        await expect(page.getByText('Create DB from a backup')).not.toBeVisible();
      });
    });
  });

  test('Hide Create DB from backup if DB has schedules and not allowed to create backups', async ({
    browser
  }) => {
    const userName = 'hide-create-db-from-backup-no-create-backups';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', 'read', `${namespace}/*`],
        ['database-clusters', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['database-clusters', 'create', `${namespace}/*`],
        ['backup-storages', 'read', `${namespace}/*`],
        ['database-cluster-backups', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['database-cluster-restores', 'create', `${namespace}/*`],
        [
          'database-cluster-credentials',
          'read',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace);
      await mockBackups(page, namespace);
      await page.goto('/databases');

      await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
      await page.getByTestId('actions-menu-button').click();
      await expect(page.getByText('Create DB from a backup')).not.toBeVisible();
    });
  });

  test('Show Create DB from backup if DB has no schedules, even if not allowed to create backups', async ({
    browser
  }) => {
    const userName = 'show-create-db-from-backup-no-create-backups';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', 'read', `${namespace}/*`],
        ['database-clusters', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['database-clusters', 'create', `${namespace}/*`],
        ['backup-storages', 'read', `${namespace}/*`],
        ['database-cluster-backups', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['monitoring-instances', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['database-cluster-restores', 'create', `${namespace}/*`],
        [
          'database-cluster-credentials',
          'read',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace, { enableSchedules: false });
      await mockBackups(page, namespace);
      await page.goto('/databases');

      await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
      await page.getByTestId('actions-menu-button').click();
      await expect(page.getByText('Create DB from a backup')).toBeVisible();
    });
  });
  test('Hide Create DB from backup if DB has monitoring enabled and not allowed to read monitoring', async ({
    browser
  }) => {
    const userName = 'hide-create-db-from-backup-no-read-monitoring';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', 'read', `${namespace}/*`],
        ['database-clusters', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['database-clusters', 'create', `${namespace}/*`],
        ['backup-storages', 'read', `${namespace}/*`],
        [
          'database-cluster-backups',
          'create',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
        ['database-cluster-restores', 'create', `${namespace}/*`],
        [
          'database-cluster-credentials',
          'read',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace);
      await mockBackups(page, namespace);

      await page.goto('/databases');
      await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
      await page.getByTestId('actions-menu-button').click();
      await expect(page.getByText('Create DB from a backup')).not.toBeVisible();
    });
  });

  test('Show Create DB from backup if DB has monitoring disabled, even if not allowed to read monitoring', async ({
    browser,
  }) => {
    const userName = 'show-create-db-from-backup-no-read-monitoring';

    await RBACTestWrapper(browser, userName, async (page, namespace, testUser) => {
      await setRBACRoleWithPermissionsK8s(`role:${userName}`, [
        ['namespaces', 'read', namespace],
        ['database-engines', 'read', `${namespace}/*`],
        ['database-clusters', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
        ['database-clusters', 'create', `${namespace}/*`],
        ['backup-storages', 'read', `${namespace}/*`],
        [
          'database-cluster-backups',
          'create',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
        ['database-cluster-restores', 'create', `${namespace}/*`],
        [
          'database-cluster-credentials',
          'read',
          `${namespace}/${MOCK_CLUSTER_NAME}`,
        ],
      ], testUser.username);
      await loginTestUser(page, testUser.username, testUser.password);

      await mockClusters(page, namespace, { enableMonitoring: false });
      await mockBackups(page, namespace);

      await page.goto('/databases');
      await expect(page.getByText(MOCK_CLUSTER_NAME)).toBeVisible();
      await page.getByTestId('actions-menu-button').click();
      await expect(page.getByText('Create DB from a backup')).toBeVisible();
    });
  });
});
