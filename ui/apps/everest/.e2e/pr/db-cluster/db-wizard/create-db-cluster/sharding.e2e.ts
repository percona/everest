import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import { getEnginesVersions } from '@e2e/utils/database-engines';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import { expect, test } from '@playwright/test';
import { selectDbEngine } from '../db-wizard-utils';
import {
  goToLastStepByStepAndSubmit,
  moveBack,
  moveForward,
} from '@e2e/utils/db-wizard';
import {
  deleteDbCluster,
  findDbAndClickRow,
} from '@e2e/utils/db-clusters-list';

test.describe('Sharding (psmdb)', () => {
  let engineVersions = {
    pxc: [],
    psmdb: [],
    postgresql: [],
  };

  let storageClasses = [];
  const namespace = EVEREST_CI_NAMESPACES.EVEREST_UI;

  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    engineVersions = await getEnginesVersions(token, namespace, request);

    const { storageClassNames = [] } = await getClusterDetailedInfo(
      token,
      request
    );
    storageClasses = storageClassNames;
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/databases');
  });

  test('Sharding toggle is presented for MongoDb during creation of database', async ({
    page,
  }) => {
    expect(storageClasses.length).toBeGreaterThan(0);
    await selectDbEngine(page, 'psmdb');

    const shardingToggle = page.getByTestId('switch-input-sharding');
    await shardingToggle.waitFor();

    expect(shardingToggle).toBeVisible();
    expect(shardingToggle).toHaveValue('false');
  });

  test('Config servers and Nº of shards is presented if sharding is enabled', async ({
    page,
  }) => {
    expect(storageClasses.length).toBeGreaterThan(0);
    await selectDbEngine(page, 'psmdb');

    const shardingToggle = page.getByTestId('switch-input-sharding');
    await shardingToggle.waitFor();

    const basicSectionSummury = page.getByTestId('section-basic-information');
    expect(basicSectionSummury.getByText('Sharding: disabled')).toBeVisible();
    await shardingToggle.click();
    expect(basicSectionSummury.getByText('Sharding: enabled')).toBeVisible();

    await moveForward(page);

    const resourcesSectionSummury = page.getByTestId('section-resources');
    expect(resourcesSectionSummury.getByText('Shards: 2')).toBeVisible();
    expect(
      resourcesSectionSummury.getByText('Configuration servers: 3')
    ).toBeVisible();

    const shardNr = page.getByTestId('text-input-shard-nr');
    expect(shardNr).toBeVisible();
    expect(shardNr).toHaveValue('2');

    const configServersNr = page.getByTestId(
      'toggle-button-group-input-shard-config-servers'
    );
    const configServers3Btn = page.getByTestId('shard-config-servers-3');

    expect(configServersNr).toBeVisible();
    expect(configServers3Btn).toHaveAttribute('aria-pressed', 'true');

    await moveBack(page);
    await shardingToggle.click();
    await moveForward(page);

    expect(shardNr).not.toBeVisible();
    expect(configServersNr).not.toBeVisible();
    expect(resourcesSectionSummury.getByText('Shards: 2')).not.toBeVisible();
    expect(
      resourcesSectionSummury.getByText('Configuration servers: 3')
    ).not.toBeVisible();
  });

  test('Sharding should be correctly displayed on the overview page', async ({
    page,
  }) => {
    const dbName = 'sharding-psmdb';
    expect(storageClasses.length).toBeGreaterThan(0);
    await selectDbEngine(page, 'psmdb');

    await page.getByTestId('switch-input-sharding').click();
    await page.getByTestId('text-input-db-name').fill(dbName);
    await goToLastStepByStepAndSubmit(page);
    await page.goto('/databases');

    await findDbAndClickRow(page, dbName);
    expect(
      page
        .getByTestId('sharding-status-overview-section-row')
        .filter({ hasText: 'Enabled' })
    ).toBeVisible();
    expect(
      page
        .getByTestId('number-of-shards-overview-section-row')
        .filter({ hasText: '2' })
    ).toBeVisible();
    expect(
      page
        .getByTestId('config-servers-overview-section-row')
        .filter({ hasText: '3' })
    ).toBeVisible();

    await deleteDbCluster(page, dbName);
  });

  test('Mongo with sharding should not pass multinode cluster creation if config servers = 1', async ({
    page,
  }) => {
    expect(storageClasses.length).toBeGreaterThan(0);
    await selectDbEngine(page, 'psmdb');

    await page.getByTestId('switch-input-sharding').click();
    await moveForward(page);

    await expect(page.getByTestId(`toggle-button-routers-3`)).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await expect(page.getByTestId('shard-config-servers-3')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.getByTestId('shard-config-servers-1').click();
    expect(page.getByTestId('shard-config-servers-error')).toBeVisible();
    expect(page.getByTestId('db-wizard-continue-button')).toBeDisabled();

    await page.getByTestId('toggle-button-nodes-1').click();
    expect(page.getByTestId('shard-config-servers-error')).not.toBeVisible();
    expect(page.getByTestId('db-wizard-continue-button')).not.toBeDisabled();

    await page.getByTestId('toggle-button-nodes-3').click();
    expect(page.getByTestId('shard-config-servers-error')).toBeVisible();
    expect(page.getByTestId('db-wizard-continue-button')).toBeDisabled();

    await page.getByTestId('shard-config-servers-3').click();
    expect(page.getByTestId('shard-config-servers-error')).not.toBeVisible();
    expect(page.getByTestId('db-wizard-continue-button')).not.toBeDisabled();
  });

  test('0 value of the Nº of shards causes an error', async ({ page }) => {
    expect(storageClasses.length).toBeGreaterThan(0);
    await selectDbEngine(page, 'psmdb');

    await page.getByTestId('switch-input-sharding').click();
    expect(page.getByTestId('switch-input-sharding')).toBeEnabled();

    await moveForward(page);

    await page.getByTestId('text-input-shard-nr').fill('0');
    expect(page.getByText('The value cannot be less than 1')).toBeVisible();
    expect(page.getByTestId('db-wizard-continue-button')).toBeDisabled();
    await page.getByTestId('text-input-shard-nr').fill('1');
    expect(page.getByTestId('db-wizard-continue-button')).not.toBeDisabled();
  });

  test('Changing the Nº of nodes causes changing the confing servers Nº automatically, until the user touches confing servers Nº', async ({
    page,
  }) => {
    expect(storageClasses.length).toBeGreaterThan(0);
    await selectDbEngine(page, 'psmdb');

    await page.getByTestId('switch-input-sharding').click();
    expect(page.getByTestId('switch-input-sharding')).toBeEnabled();

    await moveForward(page);

    expect(page.getByTestId(`toggle-button-routers-3`)).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(page.getByTestId('shard-config-servers-3')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.getByTestId('toggle-button-nodes-1').click();
    expect(page.getByTestId('shard-config-servers-1')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await page.getByTestId('toggle-button-nodes-5').click();
    expect(page.getByTestId('shard-config-servers-5')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await page.getByTestId('toggle-button-nodes-custom').click();
    await page.getByTestId('text-input-custom-nr-of-nodes').fill('7');
    expect(page.getByTestId('shard-config-servers-7')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await page.getByTestId('text-input-custom-nr-of-nodes').fill('9');
    expect(page.getByTestId('shard-config-servers-7')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.getByTestId('shard-config-servers-3').click();
    await page.getByTestId('toggle-button-nodes-1').click();
    expect(page.getByTestId('shard-config-servers-1')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(page.getByTestId('shard-config-servers-3')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test.skip('Sharding is not reset to default when returning to the previous step of the form in dbWizard', async ({
    page,
  }) => {
    expect(storageClasses.length).toBeGreaterThan(0);
    await selectDbEngine(page, 'psmdb');

    await page.getByTestId('switch-input-sharding').click();
    expect(page.getByTestId('switch-input-sharding')).toBeEnabled();

    await moveForward(page);
    await moveBack(page);

    expect(page.getByTestId('switch-input-sharding')).toBeEnabled();

    await moveForward(page);
    await moveForward(page);

    await page.getByTestId('edit-section-1').click();

    await page.getByTestId('switch-input-sharding').waitFor();
    expect(page.getByTestId('switch-input-sharding')).toBeEnabled();
  });
});
