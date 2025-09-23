import { expect, test } from '@playwright/test';
import { getCITokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getNamespacesFn } from '@e2e/utils/namespaces';
import { setRBACPermissionsK8S } from '@e2e/utils/rbac-cmd-line';

// Namespaces, engines and DBs are already filtered by the API according to permissions, so here we test the UI
test.describe('Namespaces RBAC', () => {
  let namespaces = [];

  test.beforeAll(async ({ request }) => {
    await setRBACPermissionsK8S([['namespaces', 'read', '*']]);
    const token = await getCITokenFromLocalStorage();
    namespaces = await getNamespacesFn(token, request);
  });

  test('should show upgrade button when there is permission to update DB engines', async ({
    page,
  }) => {
    await setRBACPermissionsK8S([
      ['namespaces', 'read', namespaces[0]],
      ['database-engines', '*', `${namespaces[0]}/*`],
      ['database-clusters', '*', `${namespaces[0]}/*`],
    ]);
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines`,
      async (route) => {
        await route.fulfill({
          json: {
            items: [
              {
                metadata: {
                  name: 'percona-xtradb-cluster-operator',
                  namespace: namespaces[0],
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
      `/v1/namespaces/${namespaces[0]}/database-engines/upgrade-plan`,
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
    await page.goto(`/settings/namespaces/${namespaces[0]}`);
    await expect(page.getByText('Upgrade Operators')).toBeVisible();
    await expect(page.getByText('Upgrade Operators')).not.toBeDisabled();
  });

  test('should disable upgrade button when there is no permission to update DB engines', async ({
    page,
  }) => {
    await setRBACPermissionsK8S([
      ['namespaces', 'read', namespaces[0]],
      ['database-engines', 'read', `${namespaces[0]}/*`],
      ['database-clusters', '*', `${namespaces[0]}/*`],
    ]);
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines`,
      async (route) => {
        await route.fulfill({
          json: {
            items: [
              {
                metadata: {
                  name: 'percona-xtradb-cluster-operator',
                  namespace: namespaces[0],
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
      `/v1/namespaces/${namespaces[0]}/database-engines/upgrade-plan`,
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
    await page.goto(`/settings/namespaces/${namespaces[0]}`);
    await expect(page.getByText('Upgrade Operators')).toBeVisible();
    await expect(page.getByText('Upgrade Operators')).toBeDisabled();
  });
});
