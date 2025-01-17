import { expect, Page, test } from '@playwright/test';
import { selectDbEngine } from '../db-wizard-utils';
import { moveForward } from '@e2e/utils/db-wizard';

type AffinityRuleFormArgs = {
  component?: 'DB Node' | 'Proxy' | 'Config Server';
  type?: 'Node affinity' | 'Pod affinity' | 'Pod anti-affinity';
  preference?: 'preferred' | 'required';
  weight?: string;
  topologyKey?: string;
  key?: string;
  operator?: 'in' | 'not in' | 'exists' | 'does not exist';
  values?: string;
};

const fillAffinityRuleForm = async (
  page: Page,
  {
    weight,
    topologyKey,
    key,
    operator,
    values,
    component,
    type,
    preference,
  }: AffinityRuleFormArgs
) => {
  if (preference) {
    await page.getByTestId(`toggle-button-${preference}`).click();
  }

  if (type) {
    await page.getByTestId('select-type-button').click();
    await page.getByRole('option', { name: type, exact: true }).click();
  }

  if (component) {
    await page.getByTestId('select-component-button').click();
    await page.getByRole('option', { name: component, exact: true }).click();
  }

  if (weight) {
    await page.getByTestId('text-input-weight').fill(weight);
  }

  if (topologyKey) {
    await page.getByTestId('text-input-topology-key').fill(topologyKey);
  }

  if (key) {
    await page.getByTestId('text-input-key').fill(key);
  }

  if (operator) {
    await page.getByTestId('select-operator-button').click();
    await page.getByRole('option', { name: operator, exact: true }).click();
  }

  if (values) {
    await page.getByTestId('text-input-values').fill(values);
  }
};

const addAffinityRule = async (
  page: Page,
  affinityRuleFormArgs: AffinityRuleFormArgs
) => {
  await page.getByTestId('create-affinity').click();
  await fillAffinityRuleForm(page, affinityRuleFormArgs);
  await page.getByTestId('form-dialog-add-rule').click();
};

const editAffinityRule = async (
  page: Page,
  ruleIdx: number,
  affinityRuleFormArgs: AffinityRuleFormArgs
) => {
  const rule = page.getByTestId('editable-item').nth(ruleIdx);
  await rule.getByTestId('edit-editable-item-button-affinity-rule').click();
  await fillAffinityRuleForm(page, affinityRuleFormArgs);
  await page.getByTestId('form-dialog-edit-rule').click();
};

test.describe('Affinity via wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
  });

  test('Affinity rule creation', async ({ page }) => {
    await selectDbEngine(page, 'psmdb');
    await page.getByTestId('switch-input-sharding').check();
    await moveForward(page);
    await moveForward(page);
    await moveForward(page);
    await page.getByText('Affinity', { exact: true }).waitFor();

    const defaultRules = page.getByTestId('editable-item');
    const nrRules = await defaultRules.count();
    expect(nrRules).toBe(1);
    const firstRule = await defaultRules.nth(0);

    expect(await firstRule.textContent()).toBe(
      'podAntiAffinity | kubernetes.io/hostnamePreferred - 1'
    );

    await page.getByTestId('delete-editable-item-button-affinity-rule').click();
    await page.getByTestId('confirm-dialog-delete').click();

    await addAffinityRule(page, {
      component: 'DB Node',
      type: 'Node affinity',
      preference: 'preferred',
      weight: '2',
      key: 'my-key',
      operator: 'in',
      values: 'val1, val2',
    });
    await addAffinityRule(page, {
      component: 'Proxy',
      type: 'Pod affinity',
      preference: 'required',
      topologyKey: 'my-topology-key',
      key: 'my-key',
      operator: 'does not exist',
    });
    await addAffinityRule(page, {
      component: 'Config Server',
      type: 'Pod anti-affinity',
      preference: 'preferred',
      topologyKey: 'my-topology-key',
      weight: '3',
    });

    const addedRules = page.getByTestId('editable-item');
    const nrAddedRules = await addedRules.count();
    expect(nrAddedRules).toBe(3);
    expect(await addedRules.nth(0).textContent()).toBe(
      'podAntiAffinity | my-topology-keyPreferred - 3'
    );
    expect(await addedRules.nth(1).textContent()).toBe(
      'nodeAffinity | kubernetes.io/hostname | my-key | In | val1,val2Preferred - 2'
    );
    expect(await addedRules.nth(2).textContent()).toBe(
      'podAffinity | my-topology-key | my-key | DoesNotExistRequired'
    );
    await editAffinityRule(page, 1, {
      preference: 'required',
    });
    expect(await addedRules.nth(1).textContent()).toBe(
      'nodeAffinity | kubernetes.io/hostname | my-key | In | val1,val2Required'
    );
  });
});

test.describe('Affinity via components page', () => {});
