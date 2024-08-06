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

export const moveForward = (page: Page) =>
  page.getByTestId('db-wizard-continue-button').click();

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
  await expect(page.getByTestId('db-wizard-goto-db-clusters')).toBeVisible();
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
  dbType: string,
  storageClass: string,
  clusterName: string
) => {
  await page.getByTestId('text-input-db-name').fill(clusterName);

  if (dbType == 'psmdb') {
    await page.getByTestId('mongodb-toggle-button').click();
  } else if (dbType == 'pxc') {
    await page.getByTestId('mysql-toggle-button').click();
  } else if (dbType == 'postgresql') {
    await page.getByTestId('postgresql-toggle-button').click();
  }
};

/**
 * Selects the required DB resources in db wizard and checks if the calculation of total amount
 * of resources is correct
 * @param page Page instance
 * @param cpu Requested CPU amount
 * @param memory Requested memory amount in GB
 * @param disk Requested disk size in Gb
 * @param clusterSize Number of nodes in DB cluster
 */
export const populateResources = async (
  page: Page,
  cpu: number,
  memory: number,
  disk: number,
  clusterSize: number
) => {
  await expect(page.getByTestId('step-header')).toBeVisible();
  await expect(page.getByTestId('step-description')).toBeVisible();

  await page.getByTestId('toggle-button-large').click();
  await page.getByTestId('text-input-cpu').fill(cpu.toString());
  await page.getByTestId('text-input-memory').fill(memory.toString());
  await page.getByTestId('text-input-disk').fill(disk.toString());

  const expectedCpuText = ` = ${(cpu * clusterSize).toFixed(2)} CPU`;
  const expectedMemoryText = ` = ${(memory * clusterSize).toFixed(2)} GB`;
  const expectedDiskText = ` = ${(disk * clusterSize).toFixed(2)} GB`;

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
  if (externalAccess != '') {
    await page.getByLabel('Enable External Access').check();
    await page
      .getByTestId('text-input-source-ranges.0.source-range')
      .fill(externalAccess);
  }
  if (engineParameters != '' || addDefaultEngineParameters) {
    //await page.getByRole('checkbox', {name: "engineParametersEnabled"}).check({force: true})
    await page.getByLabel('Database engine parameters').check();
    if (engineParameters != '')
      await page
        .getByTestId('text-input-engine-parameters')
        .fill(engineParameters);
    else if (dbType == 'psmdb') {
      await page
        .getByTestId('text-input-engine-parameters')
        .fill('systemLog:\n  verbosity: 1');
    } else if (dbType == 'pxc') {
      await page
        .getByTestId('text-input-engine-parameters')
        .fill(
          '[mysqld]\n  key_buffer_size=16M\n  max_allowed_packet=128M\n  max_connections=250'
        );
    } else if (dbType == 'postgresql') {
      await page
        .getByTestId('text-input-engine-parameters')
        .fill('log_connections = yes\nshared_buffers = 128MB');
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
  password: string
) => {
  // check monitoring is not available
  await expect(page.getByTestId('monitoring-warning')).toBeVisible();
  expect(await page.getByLabel('Enable monitoring').isChecked()).toBeFalsy();
  await page.getByRole('button', { name: 'Add monitoring endpoint' }).click();

  await page.getByTestId('text-input-name').fill(endpointName);
  const namespaces = page.getByTestId('text-input-allowed-namespaces');
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
