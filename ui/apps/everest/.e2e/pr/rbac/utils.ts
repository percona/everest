import { Page } from '@playwright/test';

export const mockRbacPermissions = async (
  page: Page,
  permissions?: string[][]
) => {
  await page.route('/v1/permissions', async (route) => {
    await route.fulfill({
      json: {
        enabled: permissions !== undefined,
        permissions: permissions || [],
      },
    });
  });
};

export const mockEngines = async (page: Page, namespace: string) =>
  page.route(`/v1/namespaces/${namespace}/database-engines`, async (route) => {
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
  });
