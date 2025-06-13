import {
  createPodSchedulingPolicy,
  deletePodSchedulingPolicy,
} from '@e2e/utils/policies';
import { setRBACPermissionsK8S } from '@e2e/utils/rbac-cmd-line';
import { expect, test } from '@playwright/test';
import { getNamespacesFn } from '@e2e/utils/namespaces';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';

const POD_SCHEDULING_POLICY_NAME = 'pod-scheduling-policy-rbac-test';
test.describe('Pod scheduling policies RBAC', () => {
  let namespace = '';
  test.beforeAll(async ({ request }) => {
    await setRBACPermissionsK8S([
      ['pod-scheduling-policies', '*', '*'],
      ['namespaces', 'read', '*'],
    ]);
    const namespaces = await getNamespacesFn(
      await getTokenFromLocalStorage(),
      request
    );
    namespace = namespaces[0];
    await createPodSchedulingPolicy(request, POD_SCHEDULING_POLICY_NAME, 'pxc');
  });

  test.afterAll(async ({ request }) => {
    await setRBACPermissionsK8S([['pod-scheduling-policies', '*', '*']]);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await deletePodSchedulingPolicy(request, POD_SCHEDULING_POLICY_NAME);
  });

  test('Show Pod scheduling policies when allowed', async ({ page }) => {
    await setRBACPermissionsK8S([['pod-scheduling-policies', 'read', `*`]]);
    await page.goto('/settings/pod-scheduling-policies');
    await expect(page.getByText(POD_SCHEDULING_POLICY_NAME)).toBeVisible();
  });

  test('Hide Pod scheduling policies when not allowed', async ({ page }) => {
    await setRBACPermissionsK8S([
      ['pod-scheduling-policies', 'read', 'some-other-policy'],
    ]);
    await page.goto('/settings/pod-scheduling-policies');
    await expect(page.getByText(POD_SCHEDULING_POLICY_NAME)).not.toBeVisible();
  });

  test('Ability to delete policy when allowed', async ({ page }) => {
    await setRBACPermissionsK8S([
      ['pod-scheduling-policies', 'read', `${POD_SCHEDULING_POLICY_NAME}`],
      ['pod-scheduling-policies', 'delete', `${POD_SCHEDULING_POLICY_NAME}`],
    ]);
    await page.goto('/settings/pod-scheduling-policies');
    await expect(page.getByText(POD_SCHEDULING_POLICY_NAME)).toBeVisible();
    await page
      .locator('.MuiTableRow-root')
      .filter({ hasText: POD_SCHEDULING_POLICY_NAME })
      .getByTestId('MoreHorizIcon')
      .click();
    await expect(page.getByText('Delete')).toBeVisible();
  });

  test('Hide policy delete icon when not allowed', async ({ page }) => {
    await setRBACPermissionsK8S([
      ['pod-scheduling-policies', 'read', `${POD_SCHEDULING_POLICY_NAME}`],
      ['pod-scheduling-policies', 'delete', `some-other-policy`],
    ]);
    await page.goto('/settings/pod-scheduling-policies');
    await expect(page.getByText(POD_SCHEDULING_POLICY_NAME)).toBeVisible();
    await page
      .locator('.MuiTableRow-root')
      .filter({ hasText: POD_SCHEDULING_POLICY_NAME })
      .getByTestId('MoreHorizIcon')
      .click();
    await expect(page.getByText('Delete')).not.toBeVisible();
  });

  test('Ability to update policy rules when allowed', async ({ page }) => {
    await setRBACPermissionsK8S([
      ['pod-scheduling-policies', 'read', `${POD_SCHEDULING_POLICY_NAME}`],
      ['pod-scheduling-policies', 'update', `${POD_SCHEDULING_POLICY_NAME}`],
    ]);
    await page.goto(
      `/settings/pod-scheduling-policies/${POD_SCHEDULING_POLICY_NAME}`
    );
    const addBtn = page.getByRole('button', { name: 'Add rule' });
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.getByTestId('form-dialog-add').waitFor();
    await page.getByTestId('form-dialog-add').click();
    await expect(page.getByTestId('edit-rule-button')).toBeVisible();
    await expect(page.getByTestId('delete-rule-button')).toBeVisible();
  });

  test('Hide rule actions when not allowed', async ({ page }) => {
    await setRBACPermissionsK8S([
      ['pod-scheduling-policies', 'read', `${POD_SCHEDULING_POLICY_NAME}`],
      ['pod-scheduling-policies', 'update', `${POD_SCHEDULING_POLICY_NAME}`],
    ]);
    await page.goto(
      `/settings/pod-scheduling-policies/${POD_SCHEDULING_POLICY_NAME}`
    );
    await page.getByRole('button', { name: 'Add rule' }).waitFor();
    await page.getByRole('button', { name: 'Add rule' }).click();
    await page.getByTestId('form-dialog-add').waitFor();
    await page.getByTestId('form-dialog-add').click();

    await setRBACPermissionsK8S([
      ['pod-scheduling-policies', 'read', `${POD_SCHEDULING_POLICY_NAME}`],
      ['pod-scheduling-policies', 'update', `some-other-policy`],
    ]);
    await expect(
      page.getByRole('button', { name: 'Add rule' })
    ).not.toBeVisible();
    await expect(page.getByTestId('edit-rule-button')).not.toBeVisible();
    await expect(page.getByTestId('delete-rule-button')).not.toBeVisible();
  });
});
