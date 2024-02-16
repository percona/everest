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
      'Invalid option. Please make sure you added a storage location and select it from the dropdown'
    )
  ).toBeVisible();
};
