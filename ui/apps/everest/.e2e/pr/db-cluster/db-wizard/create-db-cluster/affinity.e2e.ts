import { expect, Page, test } from '@playwright/test';
import { selectDbEngine } from '../db-wizard-utils';
import { moveForward, submitWizard } from '@e2e/utils/db-wizard';
import { findDbAndClickRow } from '@e2e/utils/db-clusters-list';
import { deleteDbClusterFn } from '@e2e/utils/db-cluster';

type AffinityRuleFormArgs = {
  component?: 'DB Node' | 'Proxy' | 'Router' | 'PG Bouncer' | 'Config Server';
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

    const configServerRules = page.getByTestId('config-server-rules');
    const dbNodeRules = page.getByTestId('db-node-rules');
    const proxyRules = page.getByTestId('proxy-rules');
    await expect(configServerRules).toBeVisible();
    await expect(dbNodeRules).toBeVisible();
    await expect(proxyRules).toBeVisible();
    expect(
      await configServerRules
        .getByTestId('config-server-rules-list')
        .getByTestId('editable-item')
        .count()
    ).toBe(1);
    expect(
      await dbNodeRules
        .getByTestId('db-node-rules-list')
        .getByTestId('editable-item')
        .count()
    ).toBe(1);
    expect(
      await proxyRules
        .getByTestId('proxy-rules-list')
        .getByTestId('editable-item')
        .count()
    ).toBe(1);

    expect(
      await page.getByTestId('config-server-rules-list').textContent()
    ).toBe('podAntiAffinity | kubernetes.io/hostnamePreferred - 1');
    expect(await page.getByTestId('db-node-rules-list').textContent()).toBe(
      'podAntiAffinity | kubernetes.io/hostnamePreferred - 1'
    );
    expect(await page.getByTestId('proxy-rules-list').textContent()).toBe(
      'podAntiAffinity | kubernetes.io/hostnamePreferred - 1'
    );

    do {
      const deleteIcons = await page
        .getByTestId('delete-editable-item-button-affinity-rule')
        .all();
      if (deleteIcons.length === 0) {
        break;
      }
      await deleteIcons[0].click();
      await page.getByText('Delete affinity rule').waitFor();
      await page.getByTestId('confirm-dialog-delete').click();
    } while (1);

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
      component: 'Router',
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

test.describe('Affinity via components page', () => {
  const dbName = 'affinity-db-test';
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/databases');
    await selectDbEngine(page, 'pxc');
    await page.getByTestId('text-input-db-name').fill(dbName);
    await moveForward(page);
    await page.getByTestId('toggle-button-nodes-1').click();
    await page.getByTestId('text-input-memory').fill('1');
    await page.getByTestId('text-input-disk').fill('1');
    await moveForward(page);
    await moveForward(page);
    await moveForward(page);
    await submitWizard(page);
  });
  test.afterAll(async ({ request }) => {
    await deleteDbClusterFn(request, dbName);
  });
  test('Interaction with rules', async ({ page }) => {
    await page.goto('/databases');
    await findDbAndClickRow(page, dbName);
    await page.getByTestId('components').click();
    await page.getByTestId('db-node-rules').waitFor();
    await page.getByTestId('proxy-rules').waitFor();
    await expect(page.getByTestId('editable-item')).toHaveCount(2);
    await page
      .getByTestId('delete-editable-item-button-affinity-rule')
      .nth(0)
      .click();
    await page.getByTestId('confirm-dialog-delete').click();
    // Only proxy rule should be left now
    await expect(page.getByTestId('editable-item')).toHaveCount(1);
    await expect(page.getByTestId('proxy-rules')).toBeVisible();
    await editAffinityRule(page, 0, {
      type: 'Pod affinity',
      preference: 'required',
      topologyKey: 'my-topology-key',
      key: 'my-key',
      operator: 'not in',
      values: 'val1, val2',
    });
    await page
      .getByText(
        'podAffinity | my-topology-key | my-key | NotIn | val1,val2Required'
      )
      .waitFor();
  });
});
