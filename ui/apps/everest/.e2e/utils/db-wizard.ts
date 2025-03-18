import { expect, Page } from '@playwright/test';

export const storageLocationAutocompleteEmptyValidationCheck = async (
  page: Page,
  id?: string
) => {
  const clearLocationButton = page
    .getByTestId(id ? id : 'storage-location-autocomplete')
    .getByTitle('Clear');
  await clearLocationButton.click();
  await expect(
    page.getByText(
      'Invalid option. Please make sure you added a backup storage and select it from the dropdown'
    )
  ).toBeVisible();
};

export const moveForward = async (page: Page) => {
  await expect(
    page.getByTestId('db-wizard-continue-button')
  ).not.toBeDisabled();
  await page.getByTestId('db-wizard-continue-button').click();
};

export const moveBack = (page: Page) =>
  page.getByTestId('db-wizard-previous-button').click();

export const goToStep = (
  page: Page,
  step:
    | 'basic-information'
    | 'resources'
    | 'backups'
    | 'advanced-configurations'
    | 'monitoring'
) => page.getByTestId(`button-edit-preview-${step}`).click();

export const setPitrEnabledStatus = async (page: Page, checked: boolean) => {
  const checkbox = page
    .getByTestId('switch-input-pitr-enabled-label')
    .getByRole('checkbox');

  const isCheckboxChecked = await checkbox.isChecked();

  if (checked !== isCheckboxChecked) {
    await checkbox.click();
  }

  expect(await checkbox.isChecked()).toBe(checked);
};

export const submitWizard = async (page: Page) => {
  await page.getByTestId('db-wizard-submit-button').click();
};

export const cancelWizard = async (page: Page) => {
  await page.getByTestId('db-wizard-cancel-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByText('Yes, cancel').click();
  await page.waitForURL('**/databases');
};

export const goToLastStepByStepAndSubmit = async (page: Page) => {
  let createDbVisible = false;
  while (!createDbVisible) {
    await moveForward(page);
    const a = await page.getByTestId('db-wizard-submit-button').isVisible();
    if (a) {
      createDbVisible = true;
    }
  }
  await submitWizard(page);
};

export const goToLastAndSubmit = async (page: Page) => {
  await goToStep(page, 'monitoring');
  await submitWizard(page);
};

/**
 * Populates the basic information in the db wizard
 * @param page Page instance
 * @param dbType Database type (psmdb, pxc, postgresql)
 * @param storageClass Storage class to use
 * @param clusterName Database cluster name
 */

export const populateBasicInformation = async (
  page: Page,
  namespace: string,
  clusterName: string,
  dbType: string,
  storageClass: string,
  mongoSharding: boolean = false
) => {
  if (namespace) {
    await page.getByTestId('k8s-namespace-autocomplete').click();
    await page.getByRole('option', { name: namespace }).click();
    await expect(page.getByTestId('text-input-k8s-namespace')).toHaveValue(
      namespace
    );
  }

  await page.getByTestId('text-input-db-name').fill(clusterName);

  if (dbType === 'psmdb') {
    await expect(page.getByText('Sharded Cluster')).toBeVisible();
    await expect(page.getByTestId('switch-input-sharding')).toBeVisible();

    if (mongoSharding) {
      await page.getByTestId('switch-input-sharding').click();
      await expect(page.getByTestId('switch-input-sharding')).toBeEnabled();
    }
  }
};

/**
 * Selects the required DB resources in db wizard and checks if the calculation of total amount
 * of resources is correct
 * @param page Page instance
 * @param cpu Requested CPU amount
 * @param memory Requested memory amount in GB
 * @param disk Requested disk size in Gi
 * @param clusterSize Number of nodes in DB cluster
 */
export const populateResources = async (
  page: Page,
  cpu: number,
  memory: number,
  disk: number,
  clusterSize: number,
  numRouters?: number,
  routerCpu?: number,
  routerMemory?: number,
  numShards?: number,
  configServers?: number
) => {
  await expect(page.getByTestId('step-header')).toBeVisible();
  await expect(page.getByTestId('step-description')).toBeVisible();

  await page.getByTestId('node-resources-toggle-button-large').click();
  await page.getByTestId('text-input-cpu').fill(cpu.toString());
  await page.getByTestId('text-input-memory').fill(memory.toString());
  await page.getByTestId('text-input-disk').fill(disk.toString());

  const expectedCpuText = ` = ${(cpu * clusterSize).toFixed(2)} CPU`;
  const expectedMemoryText = ` = ${(memory * clusterSize).toFixed(2)} GB`;
  const expectedDiskText = ` = ${(disk * clusterSize).toFixed(2)} Gi`;

  let nodesText =
    clusterSize == 1 ? `x ${clusterSize} node` : `x ${clusterSize} nodes`;
  expect(await page.getByText(nodesText).count()).toBe(3);
  await expect(page.getByTestId('cpu-resource-sum')).toHaveText(
    expectedCpuText
  );
  await expect(page.getByTestId('memory-resource-sum')).toHaveText(
    expectedMemoryText
  );
  await expect(page.getByTestId('disk-resource-sum')).toHaveText(
    expectedDiskText
  );

  if (
    numRouters !== undefined &&
    routerCpu !== undefined &&
    routerMemory !== undefined &&
    configServers !== undefined &&
    numShards !== undefined
  ) {
    await page.getByTestId('proxies-accordion').click();
    await expect(page.getByText('Number of routers')).toBeVisible();

    await page.getByTestId('toggle-button-routers-custom').click();
    await page
      .getByTestId('text-input-custom-nr-of-proxies')
      .fill(numRouters.toString());

    await page.getByTestId('router-resources-toggle-button-custom').click();

    await page.getByTestId('text-input-proxy-cpu').fill(routerCpu.toString());
    await page
      .getByTestId('text-input-proxy-memory')
      .fill(routerMemory.toString());

    const expectedRouterCpuText = ` = ${(routerCpu * numRouters).toFixed(2)} CPU`;
    const expectedRouterMemoryText = ` = ${(routerMemory * numRouters).toFixed(2)} GB`;

    await expect(page.getByTestId('proxyCpu-resource-sum')).toHaveText(
      expectedRouterCpuText
    );
    await expect(page.getByTestId('proxyMemory-resource-sum')).toHaveText(
      expectedRouterMemoryText
    );

    const shardsInput = await page.getByTestId('text-input-shard-nr');
    await shardsInput.fill(numShards.toString());

    const configServerButton = await page.getByTestId(
      `shard-config-servers-${configServers}`
    );
    await expect(configServerButton).toHaveAttribute('aria-pressed', 'true');
  }
};

/**
 * Populates the advanced configuration in the db wizard
 * @param page Page instance
 * @param dbType Database type (pxc, psmdb, postgresql)
 * @param externalAccess If IP/mask specified will enable external access
 * @param addDefaultEngineParameters Add some default db engine parameters (changes according to database)
 * @param engineParameters Add some user specific db engine parameters
 */
export const populateAdvancedConfig = async (
  page: Page,
  dbType: string,
  externalAccess: string,
  addDefaultEngineParameters: boolean,
  engineParameters: string
) => {
  const combobox = page.getByTestId('text-input-storage-class');
  await combobox.waitFor({ state: 'visible', timeout: 5000 });
  await expect(combobox).toHaveValue(/.+/, { timeout: 5000 });

  if (externalAccess != '') {
    await page.getByLabel('Enable External Access').check();
    await page
      .getByTestId('text-input-source-ranges.0.source-range')
      .fill(externalAccess);
  }
  if (engineParameters != '' || addDefaultEngineParameters) {
    await page.getByLabel('Database engine parameters').check();
    if (engineParameters != '') {
      await page
        .getByTestId('text-input-engine-parameters')
        .fill(engineParameters);
    } else {
      let inputParameters = '';

      switch (dbType) {
        case 'psmdb':
          // we set operationProfiling for PMM QAN test
          inputParameters = 'systemLog:\n verbosity: 1\noperationProfiling:\n mode: all\n slowOpThresholdMs: 100\n rateLimit: 100';
          break;
        case 'postgresql':
          inputParameters = 'log_connections = yes\nshared_buffers = 192MB';
          break;
        case 'pxc':
        default:
          inputParameters =
            '[mysqld]\n key_buffer_size=16M\n max_allowed_packet=128M\n max_connections=250';
          break;
      }

      await page
        .getByTestId('text-input-engine-parameters')
        .fill(inputParameters);
    }
  }
};

/**
 * Populates the monitoring modal form in the new db wizard
 * @param page Page instance
 * @param endpointName PMM endpoint name in Everest
 * @param namespace Namespace in which the monitoring will be used
 * @param url Endpoint URL for PMM instance
 * @param user PMM username
 * @param password PMM password
 */
export const populateMonitoringModalForm = async (
  page: Page,
  endpointName: string,
  namespace: string,
  url: string,
  user: string,
  password: string,
  warningCheck: boolean = true
) => {
  if (warningCheck) {
    // check monitoring is not available
    await expect(page.getByTestId('monitoring-warning')).toBeVisible();
  }
  expect(await page.getByLabel('Enable monitoring').isChecked()).toBeFalsy();
  await page.getByRole('button', { name: 'Add monitoring endpoint' }).click();

  await page.getByTestId('text-input-name').fill(endpointName);
  const namespaces = page.getByTestId('text-input-namespace');
  await namespaces.click();
  await page.getByRole('option', { name: namespace }).click();
  await page.getByTestId('text-input-url').fill(url);
  await page.getByTestId('text-input-user').fill(user);
  await page.getByTestId('text-input-password').fill(password);

  await expect(page.getByTestId('form-dialog-add')).toBeEnabled();
  await page.getByTestId('form-dialog-add').click();

  await expect(page.getByTestId('monitoring-warning')).not.toBeVisible();
  await expect(page.getByTestId('switch-input-monitoring')).toBeEnabled();
};
