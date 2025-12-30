import { expect, test } from '@playwright/test';
import { setRBACRoleWithPermissionsK8s } from '@e2e/utils/rbac-cmd-line';
import { RBACTestWrapper } from './utils';
import { loginTestUser } from '@e2e/utils/user';
import { TIMEOUTS } from '@e2e/constants';

// Namespaces, engines and DBs are already filtered by the API according to permissions, so here we test the UI
test.describe('Namespaces RBAC', () => {
  test.describe.configure({ timeout: TIMEOUTS.OneMinute });

  test('should show upgrade button when there is permission to update DB engines', async ({
    browser,
  }) => {
    const userName = 'namespaces-rbac-upgrade-button';
    await RBACTestWrapper(
      browser,
      userName,
      async (page, namespace, testUser) => {
        await setRBACRoleWithPermissionsK8s(
          `role:${userName}`,
          [
            ['namespaces', 'read', namespace],
            ['database-engines', '*', `${namespace}/*`],
            ['database-clusters', '*', `${namespace}/*`],
          ],
          testUser.username
        );
        await loginTestUser(page, testUser.username, testUser.password);

        await page.route(
          `/v1/namespaces/${namespace}/database-engines`,
          async (route) => {
            await route.fulfill({
              json: {
                items: [
                  {
                    metadata: {
                      name: 'percona-xtradb-cluster-operator',
                      namespace: namespace,
                    },
                    spec: {
                      type: 'pxc',
                    },
                    status: {
                      status: 'installed',
                      availableVersions: {
                        engine: {
                          '8.0.36-28.1': {
                            status: 'available',
                          },
                        },
                      },
                      pendingOperatorUpgrades: [
                        {
                          targetVersion: '1.15.0',
                        },
                      ],
                    },
                  },
                ],
              },
            });
          }
        );
        await page.route(
          `/v1/namespaces/${namespace}/database-engines/upgrade-plan`,
          async (route) => {
            await route.fulfill({
              json: {
                upgrades: [
                  {
                    name: 'percona-xtradb-cluster-operator',
                    currentVersion: '1.14.0',
                    targetVersion: '1.15.0',
                  },
                ],
                pendingActions: [],
              },
            });
          }
        );
        await page.goto(`/settings/namespaces/${namespace}`);
        await expect(page.getByText('Upgrade Operators')).toBeVisible();
        await expect(page.getByText('Upgrade Operators')).not.toBeDisabled();
      }
    );
  });

  test('should disable upgrade button when there is no permission to update DB engines', async ({
    browser,
  }) => {
    const userName = 'namespaces-rbac-upgrade-button-no-perm';

    await RBACTestWrapper(
      browser,
      userName,
      async (page, namespace, testUser) => {
        await setRBACRoleWithPermissionsK8s(
          `role:${userName}`,
          [
            ['namespaces', 'read', namespace],
            ['database-engines', 'read', `${namespace}/*`],
            ['database-clusters', '*', `${namespace}/*`],
          ],
          testUser.username
        );
        await loginTestUser(page, testUser.username, testUser.password);

        await page.route(
          `/v1/namespaces/${namespace}/database-engines`,
          async (route) => {
            await route.fulfill({
              json: {
                items: [
                  {
                    metadata: {
                      name: 'percona-xtradb-cluster-operator',
                      namespace: namespace,
                    },
                    spec: {
                      type: 'pxc',
                    },
                    status: {
                      status: 'installed',
                      availableVersions: {
                        engine: {
                          '8.0.36-28.1': {
                            status: 'available',
                          },
                        },
                      },
                      pendingOperatorUpgrades: [
                        {
                          targetVersion: '1.15.0',
                        },
                      ],
                    },
                  },
                ],
              },
            });
          }
        );
        await page.route(
          `/v1/namespaces/${namespace}/database-engines/upgrade-plan`,
          async (route) => {
            await route.fulfill({
              json: {
                upgrades: [
                  {
                    name: 'percona-xtradb-cluster-operator',
                    currentVersion: '1.14.0',
                    targetVersion: '1.15.0',
                  },
                ],
                pendingActions: [],
              },
            });
          }
        );
        await page.goto(`/settings/namespaces/${namespace}`);
        await expect(page.getByText('Upgrade Operators')).toBeVisible();
        await expect(page.getByText('Upgrade Operators')).toBeDisabled();
      }
    );
  });
});
