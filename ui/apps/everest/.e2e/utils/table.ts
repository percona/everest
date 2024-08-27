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

/**
 * Waits for specific cluster status in the cluster table list
 * @param page Page object
 * @param name Name of the cluster
 * @param status Desired status of the cluster
 * @param timeout How long to wait until error thrown
 */
export const waitForStatus = async (
  page: Page,
  dbName: string,
  status: string,
  timeout: number
) => {
  const dbRow = page.getByRole('row').filter({ hasText: dbName });
  await expect(dbRow).toBeVisible();
  await expect(dbRow.getByText(status)).toBeVisible({ timeout: timeout });
};

/**
 * Waits for specific cluster to be removed from the list of clusters
 * @param page Page object
 * @param name Name of the cluster
 * @param timeout How long to wait until error thrown
 */
export const waitForDelete = async (
  page: Page,
  dbName: string,
  timeout: number
) => {
  await expect(page.getByText(dbName)).not.toBeVisible({ timeout: timeout });
};
