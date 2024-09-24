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
    .click({ timeout: 5000 });

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

/**
 * Waits for specific object status in the table list
 * @param page Page object
 * @param name Name of the object to look for (database, backup)
 * @param status Desired status of the cluster
 * @param timeout How long to wait until error thrown
 */
export const waitForStatus = async (
  page: Page,
  name: string,
  status: string,
  timeout: number
) => {
  const dbRow = page.getByRole('row').filter({ hasText: name });
  await expect(dbRow).toBeVisible();
  await expect(dbRow.getByText(status)).toBeVisible({ timeout: timeout });
};

/**
 * Waits for specific object to be removed from the table
 * @param page Page object
 * @param name Name of the object to look for (database, backup)
 * @param timeout How long to wait until error thrown
 */
export const waitForDelete = async (
  page: Page,
  name: string,
  timeout: number
) => {
  await expect(page.getByText(name)).toHaveCount(0, { timeout: timeout });
};
