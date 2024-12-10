import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import { getEnginesVersions } from '@e2e/utils/database-engines';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getClusterDetailedInfo } from '@e2e/utils/storage-class';
import { expect, test } from '@playwright/test';
import { selectDbEngine } from '../db-wizard-utils';
import { moveBack, moveForward } from '@e2e/utils/db-wizard';

test.describe('DB Cluster creation', () => {
  // IST is UTC+5h30, with or without DST
  test.use({
    timezoneId: 'IST',
  });

  let engineVersions = {
    pxc: [],
    psmdb: [],
    postgresql: [],
  };
  let storageClasses = [];
  // let monitoringInstancesList = [];
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

  test('Sharding is not reset to default when returning to the previous step of the form in dbWizard', async ({
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
