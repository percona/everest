import { Page, expect } from '@playwright/test';


// Returns a row that matches an exact name in a <td> element
export const getClusterRow = (page: Page, name: string) => {
  return page
    .locator('.MuiTableRow-root')
    .filter({
      has: page.locator('td').getByText(name, { exact: true }),
      //has: page.getByText(name, { exact: true }),
    });
};

export const findRowAndClickActions = async (
  page: Page,
  name: string,
  nameOfAction?: string
) => {
  // cluster actions menu click
  const dbRow = getClusterRow(page, name);
    // .filter({ hasText: name })
    // .first();
  await expect(dbRow).toHaveCount(1);
  await expect(dbRow).toBeVisible({ timeout: 10000 });
  await dbRow.locator('[data-testid="MoreHorizIcon"]').click();

  if (nameOfAction) {
    await page.getByRole('menuitem', { name: nameOfAction }).click();
  }
};

// TODO remove after DB Cluster's PATCH method is implemented
export const waitForInitializingState = async (page: Page, name: string) => {
  const dbRow = getClusterRow(page, name);
  //const dbRow = page.getByRole('row').filter({ hasText: name });
  await expect(dbRow).toBeVisible();
  await expect(dbRow.getByText('Creating')).not.toBeVisible({ timeout: 15000 });
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
  const dbRow = getClusterRow(page, name);
  //const dbRow = page.getByRole('row').filter({ hasText: name });
  await expect(dbRow).toBeVisible({ timeout: 10000 });
  await expect(dbRow.getByText(status, { exact: true })).toBeVisible({
    timeout: timeout,
  });
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
  const row = getClusterRow(page, name);
  // const row = page.locator('.MuiTableRow-root').filter({ hasText: name });
  await expect(row).toHaveCount(0, { timeout: timeout });
};

export const waitForDbListLoad = async (page: Page) => {
  const rows = page.locator('.MuiTableRow-root');
  const start = Date.now();
  const timeout = 10000;

  while (Date.now() - start < timeout) {
    const count = await rows.count();
    if (count > 0) return;
    await page.waitForTimeout(200); // pause before retrying
  }
  throw new Error('Timed out waiting for DB list to load');
};
