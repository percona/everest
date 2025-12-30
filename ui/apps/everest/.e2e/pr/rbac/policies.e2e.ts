import {
  createPodSchedulingPolicy,
  createPodSchedulingPolicyWithValues,
  createRuleForPodSchedulingPolicyWithValues,
  deletePodSchedulingPolicy,
  POD_SCHEDULING_POLICIES_URL,
} from '@e2e/utils/policies';
import { setRBACRoleWithPermissionsK8s } from '@e2e/utils/rbac-cmd-line';
import { expect, test } from '@playwright/test';
import { getNamespacesFn } from '@e2e/utils/namespaces';
import { getCITokenFromLocalStorage } from '@e2e/utils/localStorage';
import {
  moveForward,
  populateBasicInformation,
  submitWizard,
} from '@e2e/utils/db-wizard';
import { deleteDbCluster } from '@e2e/utils/db-clusters-list';
import { waitForDelete, waitForStatus } from '@e2e/utils/table';
import { TIMEOUTS } from '@e2e/constants';
import { RBACTestWrapper } from './utils';

test.describe.parallel('Pod scheduling policies RBAC', () => {
  test.describe.configure({ timeout: TIMEOUTS.OneMinute });

  let namespace = '';

  test.beforeAll(async ({ request }) => {
    const namespaces = await getNamespacesFn(
      await getCITokenFromLocalStorage(),
      request
    );
    namespace = namespaces[0];
  });

  test('Show Pod scheduling policies when allowed', async ({
    browser,
    request,
  }) => {
    const userName = 'show-policies';
    const policyName = `policy-${userName}-${Date.now()}`;

    await RBACTestWrapper(browser, userName, async (page, ns, testUser) => {
      // Create unique policy for this test
      await createPodSchedulingPolicy(request, policyName, 'pxc');

      await setRBACRoleWithPermissionsK8s(
        `role:${userName}`,
        [['pod-scheduling-policies', 'read', `*`]],
        testUser.username
      );

      await page.goto(POD_SCHEDULING_POLICIES_URL);
      await expect(page.getByText(policyName)).toBeVisible();
      await expect(page.getByText('everest-default-mongodb')).toBeVisible();
      await expect(page.getByText('everest-default-mysql')).toBeVisible();
      await expect(page.getByText('everest-default-postgresql')).toBeVisible();

      // Cleanup policy
      await deletePodSchedulingPolicy(request, policyName);
    });
  });

  test('Hide Pod scheduling policies when not allowed', async ({
    browser,
    request,
  }) => {
    const userName = 'hide-policies';
    const policyName = `policy-${userName}-${Date.now()}`;

    await RBACTestWrapper(browser, userName, async (page, ns, testUser) => {
      // Create unique policy for this test
      await createPodSchedulingPolicy(request, policyName, 'pxc');

      await setRBACRoleWithPermissionsK8s(
        `role:${userName}`,
        [['pod-scheduling-policies', 'read', 'some-other-policy']],
        testUser.username
      );

      await page.goto(POD_SCHEDULING_POLICIES_URL);
      await expect(page.getByText(policyName)).not.toBeVisible();
      await expect(page.getByText('everest-default-mongodb')).not.toBeVisible();
      await expect(page.getByText('everest-default-mysql')).not.toBeVisible();
      await expect(
        page.getByText('everest-default-postgresql')
      ).not.toBeVisible();

      // Cleanup policy
      await deletePodSchedulingPolicy(request, policyName);
    });
  });

  test('Ability to delete policy when allowed', async ({
    browser,
    request,
  }) => {
    const userName = 'delete-policy-allowed';
    const policyName = `policy-${userName}-${Date.now()}`;

    await RBACTestWrapper(browser, userName, async (page, ns, testUser) => {
      // Create unique policy for this test
      await createPodSchedulingPolicy(request, policyName, 'pxc');

      await setRBACRoleWithPermissionsK8s(
        `role:${userName}`,
        [
          ['pod-scheduling-policies', 'read', `${policyName}`],
          ['pod-scheduling-policies', 'delete', `${policyName}`],
        ],
        testUser.username
      );

      await page.goto(POD_SCHEDULING_POLICIES_URL);
      await expect(page.getByText(policyName)).toBeVisible();
      await page
        .locator('.MuiTableRow-root')
        .filter({ hasText: policyName })
        .getByTestId('MoreHorizIcon')
        .click();
      await expect(page.getByText('Delete')).toBeVisible();

      // Cleanup policy
      await deletePodSchedulingPolicy(request, policyName);
    });
  });

  test('Hide policy delete icon when not allowed', async ({
    browser,
    request,
  }) => {
    const userName = 'delete-policy-not-allowed';
    const policyName = `policy-${userName}-${Date.now()}`;

    await RBACTestWrapper(browser, userName, async (page, ns, testUser) => {
      // Create unique policy for this test
      await createPodSchedulingPolicy(request, policyName, 'pxc');

      await setRBACRoleWithPermissionsK8s(
        `role:${userName}`,
        [
          ['pod-scheduling-policies', 'read', `${policyName}`],
          ['pod-scheduling-policies', 'delete', `some-other-policy`],
        ],
        testUser.username
      );

      await page.goto(POD_SCHEDULING_POLICIES_URL);
      await expect(page.getByText(policyName)).toBeVisible();
      await page
        .locator('.MuiTableRow-root')
        .filter({ hasText: policyName })
        .getByTestId('MoreHorizIcon')
        .click();
      await expect(page.getByText('Delete')).not.toBeVisible();

      // Cleanup policy
      await deletePodSchedulingPolicy(request, policyName);
    });
  });

  test('Ability to update policy rules when allowed', async ({
    browser,
    request,
    page: setupPage,
  }) => {
    const userName = 'update-policy-allowed';
    const policyName = `policy-${userName}-${Date.now()}`;

    // Create policy with a rule before test
    await createPodSchedulingPolicyWithValues(setupPage, policyName, 'pxc');
    await createRuleForPodSchedulingPolicyWithValues(
      setupPage,
      policyName,
      'engine',
      'nodeAffinity',
      'required',
      1,
      '',
      'size',
      'In',
      'medium,large'
    );

    await RBACTestWrapper(browser, userName, async (page, ns, testUser) => {
      await setRBACRoleWithPermissionsK8s(
        `role:${userName}`,
        [
          ['pod-scheduling-policies', 'read', `${policyName}`],
          ['pod-scheduling-policies', 'update', `${policyName}`],
        ],
        testUser.username
      );

      await page.goto(`${POD_SCHEDULING_POLICIES_URL}/${policyName}`);
      const addBtn = page.getByRole('button', { name: 'Add rule' });
      await expect(addBtn).toBeVisible();
      await addBtn.click();
      await page.getByTestId('form-dialog-add').waitFor();
      await page.getByTestId('form-dialog-add').click();
      expect(
        await page.locator('[data-testid="edit-rule-button"]').count()
      ).toBeGreaterThan(0);
      expect(
        await page.locator('[data-testid="delete-rule-button"]').count()
      ).toBeGreaterThan(0);

      // Cleanup policy
      await deletePodSchedulingPolicy(request, policyName);
    });
  });

  test('Hide rule actions when not allowed', async ({
    browser,
    request,
    page: setupPage,
  }) => {
    const userName = 'update-policy-not-allowed';
    const policyName = `policy-${userName}-${Date.now()}`;

    // Create policy with a rule before test
    await createPodSchedulingPolicyWithValues(setupPage, policyName, 'pxc');
    await createRuleForPodSchedulingPolicyWithValues(
      setupPage,
      policyName,
      'engine',
      'nodeAffinity',
      'required',
      1,
      '',
      'size',
      'In',
      'medium,large'
    );

    await RBACTestWrapper(browser, userName, async (page, ns, testUser) => {
      // First allow updates to add a rule
      await setRBACRoleWithPermissionsK8s(
        `role:${userName}`,
        [
          ['pod-scheduling-policies', 'read', `${policyName}`],
          ['pod-scheduling-policies', 'update', `${policyName}`],
        ],
        testUser.username
      );

      await page.goto(`${POD_SCHEDULING_POLICIES_URL}/${policyName}`);
      await page.getByRole('button', { name: 'Add rule' }).waitFor();
      await page.getByRole('button', { name: 'Add rule' }).click();
      await page.getByTestId('form-dialog-add').waitFor();
      await page.getByTestId('form-dialog-add').click();

      // Now remove update permission
      await setRBACRoleWithPermissionsK8s(
        `role:${userName}`,
        [
          ['pod-scheduling-policies', 'read', `${policyName}`],
          ['pod-scheduling-policies', 'update', `some-other-policy`],
        ],
        testUser.username
      );

      // Wait for permissions to propagate
      await page.waitForTimeout(3000);
      await page.reload();

      await expect(
        page.getByRole('button', { name: 'Add rule' })
      ).not.toBeVisible();
      await expect(page.getByTestId('edit-rule-button')).not.toBeVisible();
      await expect(page.getByTestId('delete-rule-button')).not.toBeVisible();

      // Cleanup policy
      await deletePodSchedulingPolicy(request, policyName);
    });
  });

  test('Show only allowed policies on wizard', async ({ browser, request }) => {
    const userName = 'policies-wizard';
    const policyName = `policy-${userName}-${Date.now()}`;
    const clusterName = `pxc-rbac-${Date.now()}`;

    // Create policy before test
    await createPodSchedulingPolicy(request, policyName, 'pxc');

    await RBACTestWrapper(browser, userName, async (page, ns, testUser) => {
      await setRBACRoleWithPermissionsK8s(
        `role:${userName}`,
        [
          ['pod-scheduling-policies', 'read', `${policyName}`],
          ['namespaces', 'read', '*'],
          ['database-engines', '*', '*/*'],
          ['database-clusters', '*', '*/*'],
        ],
        testUser.username
      );

      await page.goto('/databases');
      await page.getByTestId('add-db-cluster-button').waitFor();
      await page.getByTestId('add-db-cluster-button').click();
      await page.getByTestId('add-db-cluster-button-pxc').click();
      await populateBasicInformation(
        page,
        namespace,
        clusterName,
        'pxc',
        '',
        false,
        null
      );
      await moveForward(page);
      await moveForward(page);
      await moveForward(page);

      await expect(
        page
          .getByTestId('switch-input-pod-scheduling-policy-enabled')
          .getByRole('checkbox')
      ).toBeEnabled();
      await page
        .getByTestId('switch-input-pod-scheduling-policy-enabled')
        .getByRole('checkbox')
        .check();
      await page.getByTestId('select-pod-scheduling-policy-button').click();
      await expect(page.getByRole('option')).toHaveCount(1);
      await page.getByRole('option').first().click();
      await moveForward(page);
      await submitWizard(page);

      await deleteDbCluster(page, clusterName);
      await waitForStatus(page, clusterName, 'Deleting', 15000);
      await waitForDelete(page, clusterName, 240000);

      // Cleanup policy
      await deletePodSchedulingPolicy(request, policyName);
    });
  });
});
