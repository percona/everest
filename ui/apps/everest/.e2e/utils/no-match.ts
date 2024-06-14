import { expect, Page } from '@playwright/test';

export const checkNoMatchPage = async (page: Page) => {
  const button = page.getByTestId('no-match-button');

  await expect(button).toBeVisible({ timeout: 15000 });
};
