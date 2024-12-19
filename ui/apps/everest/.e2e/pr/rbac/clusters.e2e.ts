import { expect, Page, test } from '@playwright/test';
import { mockEngines, mockRbacPermissions } from './utils';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getNamespacesFn } from '@e2e/utils/namespaces';

const { CI_USER: user } = process.env;
const CLUSTER_NAME = 'cluster-1';
const mockClusters = (page: Page, namespace: string) =>
  page.route(`/v1/namespaces/${namespace}/database-clusters`, async (route) => {
    await route.fulfill({
      json: {
        items: [
          {
            metadata: {
              name: CLUSTER_NAME,
              namespace,
            },
            spec: {
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
  });
const mockCluster = (page: Page, namespace: string, clusterName: string) =>
  page.route(
    `/v1/namespaces/${namespace}/database-clusters/${clusterName}`,
    async (route) => {
      await route.fulfill({
        json: {
          metadata: {
            name: CLUSTER_NAME,
            namespace,
          },
          spec: {
            engine: {
              type: 'pxc',
              replicas: 1,
              resources: {
                cpu: '1',
                memory: '1G',
              },
              storage: {
                size: '1Gi',
              },
            },
            proxy: {
              replicas: 1,
              resources: {
                cpu: '200m',
                memory: '200M',
              },
            },
            monitoring: {},
          },
        },
      });
    }
  );

test.describe('Clusters RBAC', () => {
  let namespace = '';

  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    const namespaces = await getNamespacesFn(token, request);
    namespace = namespaces[0];
  });

  test('permitted cluster creation with present clusters', async ({ page }) => {
    await mockEngines(page, namespace);
    await mockRbacPermissions(page, [
      [user, 'namespaces', 'read', namespace],
      [user, 'database-engines', '*', `${namespace}/*`],
      [user, 'database-clusters', '*', `${namespace}/*`],
    ]);
    await mockClusters(page, namespace);
    await page.goto('/databases');
    await expect(page.getByText('Create database')).toBeVisible();
    await expect(page.getByText('Create database')).not.toBeDisabled();
  });

  test('permitted cluster creation without present clusters', async ({
    page,
  }) => {
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

  test('not permitted cluster creation with present clusters', async ({
    page,
  }) => {
    await mockEngines(page, namespace);
    await mockClusters(page, namespace);
    await mockRbacPermissions(page, [
      [user, 'namespaces', 'read', namespace],
      [user, 'database-engines', '*', `${namespace}/*`],
      [user, 'database-clusters', 'read', `${namespace}/*`],
    ]);
    await page.goto('/databases');
    await expect(page.getByText('Create database')).not.toBeVisible();
  });

  test('not permitted cluster creation without present clusters', async ({
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

  test('visible actions', async ({ page }) => {
    await mockEngines(page, namespace);
    await mockClusters(page, namespace);
    await mockCluster(page, namespace, CLUSTER_NAME);
    await mockRbacPermissions(page, [
      [user, 'namespaces', 'read', namespace],
      [user, 'database-engines', '*', `${namespace}/*`],
      [user, 'database-clusters', '*', `${namespace}/${CLUSTER_NAME}`],
    ]);
    await page.goto('/databases');
    await page.getByTestId('actions-menu-button').click();
    await expect(page.getByText('Delete')).toBeVisible();
    await expect(page.getByText('Suspend')).toBeVisible();
    await expect(page.getByText('Restart')).toBeVisible();

    await page.goto(`/databases/${namespace}/${CLUSTER_NAME}`);
    await expect(
      page.getByTestId('edit-advanced-configuration-button')
    ).toBeVisible();
    await expect(
      page.getByTestId('edit-advanced-configuration-button')
    ).not.toBeDisabled();
    await expect(page.getByTestId('edit-resources-button')).toBeVisible();
    await expect(page.getByTestId('edit-resources-button')).not.toBeDisabled();
  });

  test('not visible actions', async ({ page }) => {
    await mockEngines(page, namespace);
    await mockClusters(page, namespace);
    await mockRbacPermissions(page, [
      [user, 'namespaces', 'read', namespace],
      [user, 'database-engines', '*', `${namespace}/*`],
      [user, 'database-clusters', 'read', `${namespace}/${CLUSTER_NAME}`],
    ]);
    await page.goto('/databases');
    await expect(page.getByTestId('actions-menu-button')).not.toBeVisible();
  });
});
