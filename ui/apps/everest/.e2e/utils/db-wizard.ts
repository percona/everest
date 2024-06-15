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
