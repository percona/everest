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
        availableVersions: {
          engine: {},
        },
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
        availableVersions: {
          engine: {},
        },
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
        availableVersions: {
          engine: {},
        },
      },
      metadata: {
        name: 'percona-server-mongodb-operator',
      },
    },
  ],
});

const generateMockOperatorVersionData = (
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
          json: generateMockOperatorVersionData([
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
      page.getByText('Version 1.16.0 of the psmdb operator is available.')
    ).toBeVisible();
    await expect(await page.locator('tbody tr').count()).toBe(1);
    await expect(
      page.getByRole('button', { name: 'Upgrade Operator' })
    ).not.toBeDisabled();
    await page.getByRole('button', { name: 'Upgrade Operator' }).click();
    await expect(
      page.getByText(
        `Are you sure you want to upgrade psmdb operator in namespace ${namespaces[0]} to version 1.16.0?`
      )
    ).toBeVisible();
  });

  test('show new version even if no databases available', async ({ page }) => {
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
          json: generateMockOperatorVersionData([]),
        });
      }
    );
    await page.goto(`/settings/namespaces/${namespaces[0]}`);
    await expect(page.getByText('Upgrade available')).toBeVisible();
    await page.getByTestId('mongodb-toggle-button').click();
    await expect(
      page.getByRole('button', { name: 'Upgrade Operator' })
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
    await expect(
      page
        .getByTestId('toggle-button-group-input-db-type')
        .getByText('Upgrading')
    ).toBeVisible();
    const dbButtons = await page
      .getByTestId('toggle-button-group-input-db-type')
      .getByRole('button')
      .all();
    dbButtons.forEach(async (button) => {
      await expect(button).toBeDisabled();
    });
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
          json: generateMockOperatorVersionData([
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
        'Version 1.16.0 of the psmdb operator is available. Start upgrading by performing all the pending tasks.'
      )
    ).toBeVisible();
  });

  test('Post-upgrade tasks', async ({ page }) => {
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

    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines/*/operator-version`,
      async (route) => {
        await route.fulfill({
          json: generateMockOperatorVersionData([
            {
              name: 'db1',
              message: 'Restart required',
              pendingTask: 'restart',
            },
            {
              name: 'db2',
              message: 'Ready',
              pendingTask: 'ready',
            },
          ]),
        });
      }
    );

    await page.goto(`/settings/namespaces/${namespaces[0]}`);
    await page.getByTestId('mongodb-toggle-button').click();
    await expect(
      page.getByText(
        'Complete the upgrade by completing the post-upgrade tasks.'
      )
    ).toBeVisible();
  });

  test('Upgrade engine version via message parsing', async ({ page }) => {
    const mockData = generateMockEngineData({
      pg: { status: 'installed', version: '2.3.1' },
      mongo: {
        status: 'installed',
        version: '1.15.0',
        pendingVersion: '1.16.0',
      },
      mysql: { status: 'installed', version: '1.13.0' },
    });

    mockData.items[2].status.availableVersions.engine = {
      '8.0.29-21.1': {
        status: 'available',
      },
    };
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines`,
      async (route) => {
        await route.fulfill({
          json: mockData,
        });
      }
    );
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-clusters`,
      async (route) => {
        await route.fulfill({
          json: {
            items: [
              {
                metadata: {
                  name: 'db1',
                },
                spec: {
                  engine: {
                    version: '8.0.25-15.1',
                  },
                },
              },
            ],
          },
        });
      }
    );
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines/*/operator-version/preflight?targetVersion=1.16.0`,
      async (route) => {
        await route.fulfill({
          json: generateMockOperatorVersionData([
            {
              name: 'db1',
              message: 'Upgrade DB version to 8.0.29-21.1 or higher',
              pendingTask: 'upgradeEngine',
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
    await expect(
      page.getByRole('button', { name: 'Upgrade Operator' })
    ).toBeDisabled();
    await expect(
      page.getByText('Upgrade DB version to 8.0.29-21.1 or higher')
    ).toBeVisible();
    await page.getByTestId('update-db-button').click();
    await expect(
      page.getByText(
        'Your DB engine will be upgraded to version 8.0.29-21.1 in db1 cluster.'
      )
    ).toBeVisible();
  });

  test('Upgrade engine version via recommended versions', async ({ page }) => {
    const mockData = generateMockEngineData({
      pg: { status: 'installed', version: '2.3.1' },
      mongo: {
        status: 'installed',
        version: '1.15.0',
        pendingVersion: '1.16.0',
      },
      mysql: { status: 'installed', version: '1.13.0' },
    });

    mockData.items[2].status.availableVersions.engine = {
      '8.0.29-21.0': {
        status: 'available',
      },
      '8.0.29-21.1': {
        status: 'available',
      },
      '8.0.29-21.2': {
        status: 'recommended',
      },
      '8.0.29-21.3': {
        status: 'recommended',
      },
    };
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines`,
      async (route) => {
        await route.fulfill({
          json: mockData,
        });
      }
    );
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-clusters`,
      async (route) => {
        await route.fulfill({
          json: {
            items: [
              {
                metadata: {
                  name: 'db1',
                },
                spec: {
                  engine: {
                    version: '8.0.25-15.1',
                  },
                },
              },
            ],
          },
        });
      }
    );
    await page.route(
      `/v1/namespaces/${namespaces[0]}/database-engines/*/operator-version/preflight?targetVersion=1.16.0`,
      async (route) => {
        await route.fulfill({
          json: generateMockOperatorVersionData([
            {
              name: 'db1',
              message: 'Upgrade DB version',
              pendingTask: 'upgradeEngine',
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
    await expect(
      page.getByRole('button', { name: 'Upgrade Operator' })
    ).toBeDisabled();
    await expect(page.getByText('Upgrade DB version')).toBeVisible();
    await page.getByTestId('update-db-button').click();
    await expect(
      page.getByText(
        'Your DB engine will be upgraded to version 8.0.29-21.3 in db1 cluster.'
      )
    ).toBeVisible();
  });
});
