import { expect, test } from '@playwright/test';
import {
  mockEngines,
  MOCK_CLUSTER_NAME,
  mockClusters,
  RBACTestWrapper,
} from './utils';
import { setRBACRoleWithPermissionsK8s } from '@e2e/utils/rbac-cmd-line';
import { loginTestUser } from '@e2e/utils/user';
import { TIMEOUTS } from '@e2e/constants';

test.describe.parallel('Clusters RBAC', () => {
  test.describe.configure({ timeout: TIMEOUTS.OneMinute });

  test('permitted cluster creation with present clusters', async ({
    browser,
  }) => {
    const userName = 'permitted-clstr-with-clstrs';

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

        await mockEngines(page, namespace);
        await mockClusters(page, namespace);
        await page.goto('/databases');
        await expect(page.getByText('Create database')).toBeVisible();
        await expect(page.getByText('Create database')).not.toBeDisabled();
      }
    );
  });

  test('permitted cluster creation without present clusters', async ({
    browser,
  }) => {
    const userName = 'permitted-clstr-without-clstrs';

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

        await mockEngines(page, namespace);
        await page.goto('/databases');
        await expect(page.getByText('Create database')).toBeVisible();
        await expect(page.getByText('Create database')).not.toBeDisabled();
      }
    );
  });

  test('not permitted cluster creation with present clusters', async ({
    browser,
  }) => {
    const userName = 'not-permitted-clstr-with-clstrs';

    await RBACTestWrapper(
      browser,
      userName,
      async (page, namespace, testUser) => {
        await setRBACRoleWithPermissionsK8s(
          `role:${userName}`,
          [
            ['namespaces', 'read', namespace],
            ['database-engines', '*', `${namespace}/*`],
            ['database-clusters', 'read', `${namespace}/*`],
          ],
          testUser.username
        );
        await loginTestUser(page, testUser.username, testUser.password);

        await mockEngines(page, namespace);
        await mockClusters(page, namespace);
        await page.goto('/databases');
        await expect(page.getByText('Create database')).not.toBeVisible();
      }
    );
  });

  test('not permitted cluster creation without present clusters', async ({
    browser,
  }) => {
    const userName = 'not-permitted-clstr-without-clstrs';

    await RBACTestWrapper(
      browser,
      userName,
      async (page, namespace, testUser) => {
        await setRBACRoleWithPermissionsK8s(
          `role:${userName}`,
          [
            ['namespaces', 'read', namespace],
            ['database-engines', '*', `${namespace}/*`],
            ['database-clusters', 'read', `${namespace}/*`],
          ],
          testUser.username
        );
        await loginTestUser(page, testUser.username, testUser.password);

        await mockEngines(page, namespace);

        await page.goto('/databases');
        await expect(page.getByText('Create database')).not.toBeVisible();
      }
    );
  });

  test('visible actions', async ({ browser }) => {
    const userName = 'visible-clstr-actions';

    await RBACTestWrapper(
      browser,
      userName,
      async (page, namespace, testUser) => {
        await mockClusters(page, namespace);
        await setRBACRoleWithPermissionsK8s(
          `role:${userName}`,
          [
            ['namespaces', 'read', namespace],
            ['database-engines', '*', `${namespace}/*`],
            ['database-clusters', '*', `${namespace}/${MOCK_CLUSTER_NAME}`],
          ],
          testUser.username
        );
        await loginTestUser(page, testUser.username, testUser.password);

        await mockEngines(page, namespace);

        await page.goto('/databases');
        await page.getByTestId('actions-menu-button').click();
        await expect(page.getByText('Delete')).toBeVisible();
        await expect(page.getByText('Suspend')).toBeVisible();
        await expect(page.getByText('Restart')).toBeVisible();

        await page.goto(`/databases/${namespace}/${MOCK_CLUSTER_NAME}`);
        await expect(
          page.getByTestId('edit-advanced-configuration-db-btn')
        ).toBeVisible();
        await expect(
          page.getByTestId('edit-advanced-configuration-db-btn')
        ).not.toBeDisabled();
        await expect(page.getByTestId('edit-resources-button')).toBeVisible();
        await expect(
          page.getByTestId('edit-resources-button')
        ).not.toBeDisabled();
      }
    );
  });

  test('not visible actions', async ({ browser }) => {
    const userName = 'not-visible-clstr-actions';

    await RBACTestWrapper(
      browser,
      userName,
      async (page, namespace, testUser) => {
        await setRBACRoleWithPermissionsK8s(
          `role:${userName}`,
          [
            ['namespaces', 'read', namespace],
            ['database-engines', '*', `${namespace}/*`],
            ['database-clusters', 'read', `${namespace}/${MOCK_CLUSTER_NAME}`],
          ],
          testUser.username
        );
        await loginTestUser(page, testUser.username, testUser.password);

        await mockClusters(page, namespace);
        await mockEngines(page, namespace);

        await page.goto('/databases');
        await expect(page.getByTestId('actions-menu-button')).not.toBeVisible();
        await page.goto(`/databases/${namespace}/${MOCK_CLUSTER_NAME}`);
        await expect(
          page.getByTestId('edit-advanced-configuration-db-btn')
        ).not.toBeVisible();
        await expect(page.getByTestId('edit-resources-button')).toBeDisabled();
      }
    );
  });
});
