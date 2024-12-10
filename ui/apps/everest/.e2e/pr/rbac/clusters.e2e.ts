import { expect, test } from '@playwright/test';
import { mockEngines, mockRbacPermissions } from './utils';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getNamespacesFn } from '@e2e/utils/namespaces';

const { CI_USER: user } = process.env;

test.describe('Clusters RBAC', () => {
  let namespace = '';

  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    const namespaces = await getNamespacesFn(token, request);
    namespace = namespaces[0];
  });

  test('should allow cluster creation when there are already clusters', async ({
    page,
  }) => {
    await mockEngines(page, namespace);
    await mockRbacPermissions(page, [
      [user, 'namespaces', 'read', namespace],
      [user, 'database-engines', '*', `${namespace}/*`],
      [user, 'database-clusters', '*', `${namespace}/*`],
    ]);
    await page.route(
      `/v1/namespaces/${namespace}/database-clusters`,
      async (route) => {
        await route.fulfill({
          json: {
            items: [
              {
                metadata: {
                  name: 'cluster-1',
                  namespace,
                },
                spec: {
                  databaseName: 'db-1',
                  engine: {
                    type: 'pxc',
                    storage: {
                      size: '1Gi',
                    },
                  },
                },
              },
            ],
          },
        });
      }
    );
    await page.goto('/databases');
    await expect(page.getByText('Create database')).toBeVisible();
    await expect(page.getByText('Create database')).not.toBeDisabled();
  });

  test('should allow cluster creation from empty table', async ({ page }) => {
    await mockEngines(page, namespace);
    await mockRbacPermissions(page, [
      [user, 'namespaces', 'read', namespace],
      [user, 'database-engines', '*', `${namespace}/*`],
      [user, 'database-clusters', '*', `${namespace}/*`],
    ]);
    await page.goto('/databases');
    await expect(page.getByText('Create database')).toBeVisible();
    await expect(page.getByText('Create database')).not.toBeDisabled();
  });

  test('should not allow cluster creation when there are already clusters', async ({
    page,
  }) => {
    await mockEngines(page, namespace);
    await page.route(
      `/v1/namespaces/${namespace}/database-clusters`,
      async (route) => {
        await route.fulfill({
          json: {
            items: [
              {
                metadata: {
                  name: 'cluster-1',
                  namespace,
                },
                spec: {
                  databaseName: 'db-1',
                  engine: {
                    type: 'pxc',
                    storage: {
                      size: '1Gi',
                    },
                  },
                },
              },
            ],
          },
        });
      }
    );
    await mockRbacPermissions(page, [
      [user, 'namespaces', 'read', namespace],
      [user, 'database-engines', '*', `${namespace}/*`],
      [user, 'database-clusters', 'read', `${namespace}/*`],
    ]);
    await page.goto('/databases');
    await expect(page.getByText('Create database')).not.toBeVisible();
  });

  test('should not allow cluster creation from empty table', async ({
    page,
  }) => {
    await mockEngines(page, namespace);
    await mockRbacPermissions(page, [
      [user, 'namespaces', 'read', namespace],
      [user, 'database-engines', '*', `${namespace}/*`],
      [user, 'database-clusters', 'read', `${namespace}/*`],
    ]);
    await page.goto('/databases');
    await expect(page.getByText('Create database')).not.toBeVisible();
  });
});
