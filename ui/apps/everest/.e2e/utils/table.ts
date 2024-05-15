import { Page, expect } from '@playwright/test';

export const findRowAndClickActions = async (
  page: Page,
  name: string,
  nameOfAction?: string
) => {
  // cluster actions menu click
  await page
    .locator('.MuiTableRow-root')
    .filter({ hasText: name })
    .getByTestId('MoreHorizIcon')
    .click();

  if (nameOfAction) {
    await page.getByRole('menuitem', { name: nameOfAction }).click();
  }
};

// TODO remove after DB Cluster's PATCH method is implemented
export const waitForInitializingState = async (page: Page, name: string) => {
  const dbRow = page.getByRole('row').filter({ hasText: name });
  await expect(dbRow).toBeVisible();
  await expect(dbRow.getByText('Unknown')).not.toBeVisible({ timeout: 15000 });
};
