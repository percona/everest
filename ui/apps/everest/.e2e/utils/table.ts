import { Page } from '@playwright/test';

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
