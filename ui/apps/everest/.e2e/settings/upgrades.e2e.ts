import { test, expect } from '@playwright/test';
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { getNamespacesFn } from '../utils/namespaces';

const generateMockEngineData = ({
  pg,
  mongo,
  mysql,
}: {
  [key in 'pg' | 'mysql' | 'mongo']: {
    status: string;
    version: string;
    pendingVersion?: string;
  };
}) => ({
  items: [
    {
      spec: {
        type: 'postgresql',
      },
      status: {
        status: pg.status,
        operatorVersion: pg.version,
        pendingOperatorUpgrades: pg.pendingVersion
          ? [{ targetVersion: pg.pendingVersion }]
          : undefined,
      },
      metadata: {
        name: 'percona-postgresql-operator',
      },
    },
    {
      spec: {
        type: 'pxc',
      },
      status: {
        status: mysql.status,
        operatorVersion: mysql.version,
        pendingOperatorUpgrades: mysql.pendingVersion
          ? [{ targetVersion: mysql.pendingVersion }]
          : undefined,
      },
      metadata: {
        name: 'percona-xtradb-cluster-operator',
      },
    },
    {
      spec: {
        type: 'psmdb',
      },
      status: {
        status: mongo.status,
        operatorVersion: mongo.version,
        pendingOperatorUpgrades: mongo.pendingVersion
          ? [{ targetVersion: mongo.pendingVersion }]
          : undefined,
      },
      metadata: {
        name: 'percona-server-mongodb-operator',
      },
    },
  ],
});

const generateMockPreflightData = (
  databases: Array<{ name: string; message: string; pendingTask: string }>
) => ({
  currentVersion: '',
  databases,
});

test.describe('Operator upgrades', () => {
  let namespaces = [];

  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    namespaces = await getNamespacesFn(token, request);
  });

  test('show operator versions without any upgrade header above table', async ({
    page,
  }) => {
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines`,
      async (route) => {
        await route.fulfill({
          json: generateMockEngineData({
            pg: { status: 'installed', version: '2.3.1' },
            mongo: { status: 'installed', version: '1.15.0' },
            mysql: { status: 'installed', version: '1.13.0' },
          }),
        });
      }
    );
    await page.goto(`/settings/namespaces/${namespaces[0]}`);
    await expect(page.getByText('version 2.3.1')).toBeVisible();
    await expect(page.getByText('version 1.15.0')).toBeVisible();
    await expect(page.getByText('version 1.13.0')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Upgrade Operator' })
    ).not.toBeVisible();
  });

  test('show new version available with upgrade button', async ({ page }) => {
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines`,
      async (route) => {
        await route.fulfill({
          json: generateMockEngineData({
            pg: { status: 'installed', version: '2.3.1' },
            mongo: {
              status: 'installed',
              version: '1.15.0',
              pendingVersion: '1.16.0',
            },
            mysql: { status: 'installed', version: '1.13.0' },
          }),
        });
      }
    );
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines/*/operator-version/preflight?targetVersion=1.16.0`,
      async (route) => {
        await route.fulfill({
          json: generateMockPreflightData([
            {
              name: 'db1',
              message: 'some message',
              pendingTask: 'ready',
            },
          ]),
        });
      }
    );
    await page.goto(`/settings/namespaces/${namespaces[0]}`);
    await expect(
      page.getByRole('button', { name: 'Upgrade Operator' })
    ).not.toBeVisible();
    await expect(page.getByText('Upgrade available')).toBeVisible();
    await page.getByTestId('mongodb-toggle-button').click();
    await expect(
      page.getByRole('button', { name: 'Upgrade Operator' })
    ).toBeVisible();
    await expect(
      page.getByText('A new version of the psmdb operator is available.')
    ).toBeVisible();
    await expect(await page.locator('tbody tr').count()).toBe(1);
    await page.getByRole('button', { name: 'Upgrade Operator' }).click();
    expect(
      page.getByText(`Are you sure you want to upgrade psmdb operator`)
    ).toBeVisible();
  });

  test('Upgrading', async ({ page }) => {
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines`,
      async (route) => {
        await route.fulfill({
          json: generateMockEngineData({
            pg: { status: 'installed', version: '2.3.1' },
            mongo: {
              status: 'upgrading',
              version: '1.15.0',
            },
            mysql: { status: 'installed', version: '1.13.0' },
          }),
        });
      }
    );
    await page.goto(`/settings/namespaces/${namespaces[0]}`);
    (await page.getByRole('button').all()).forEach((button) => {
      expect(button).toBeDisabled();
    });
    await expect(
      page.getByTestId('mongodb-toggle-button').getByText('Upgrading')
    ).toBeVisible();
  });

  test('Pending tasks', async ({ page }) => {
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines`,
      async (route) => {
        await route.fulfill({
          json: generateMockEngineData({
            pg: { status: 'installed', version: '2.3.1' },
            mongo: {
              status: 'installed',
              version: '1.15.0',
              pendingVersion: '1.16.0',
            },
            mysql: { status: 'installed', version: '1.13.0' },
          }),
        });
      }
    );
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines/*/operator-version/preflight?targetVersion=1.16.0`,
      async (route) => {
        await route.fulfill({
          json: generateMockPreflightData([
            {
              name: 'db1',
              message: 'some message',
              pendingTask: 'notReady',
            },
            {
              name: 'db2',
              message: 'some message',
              pendingTask: 'ready',
            },
          ]),
        });
      }
    );
    await page.goto(`/settings/namespaces/${namespaces[0]}`);
    await page.getByTestId('mongodb-toggle-button').click();
    await expect(await page.locator('tbody tr').count()).toBe(2);
    await expect(
      page.getByRole('button', { name: 'Upgrade Operator' })
    ).toBeDisabled();
    await expect(page.getByText('1/2 tasks pending')).toBeVisible();
    await expect(
      page.getByText(
        'A new version of the psmdb operator is available. Start upgrading by performing all the pending tasks.'
      )
    ).toBeVisible();
  });
});
