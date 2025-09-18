import { STORAGE_STATE_FILE, TIMEOUTS } from '@e2e/constants';
import { Page, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
const { CI_USER, CI_PASSWORD } = process.env;
const { SESSION_USER, SESSION_PASS } = process.env;

export const switchUser = async (
  page: Page,
  user: string,
  password: string
) => {
  await page.goto('/');
  await page.getByTestId('user-appbar-button').click();
  await page.getByRole('menuitem').filter({ hasText: 'Log out' }).click();
  await expect(
    page.getByRole('button').filter({ hasText: 'Log in' })
  ).toBeVisible();
  await page.getByTestId('text-input-username').fill(user);
  await page.getByTestId('text-input-password').fill(password);
  await page.waitForTimeout(1000);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('user-appbar-button')).toBeVisible({
    timeout: TIMEOUTS.ThirtySeconds,
  });
  await page.context().storageState({ path: STORAGE_STATE_FILE });
};

export const login = async (page: Page) => {
  await page.goto('/login');
  await page.getByTestId('text-input-username').fill(CI_USER);
  await page.getByTestId('text-input-password').fill(CI_PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('user-appbar-button')).toBeVisible({
    timeout: TIMEOUTS.ThirtySeconds,
  });

  const origins = (await page.context().storageState()).origins;
  expect(origins.length).toBeGreaterThan(0);
  expect(
    origins.find(
      (origin) =>
        !!origin.localStorage.find((storage) => storage.name === 'everestToken')
    )
  ).not.toBeUndefined();
  await page.context().storageState({ path: STORAGE_STATE_FILE });
};

export const logout = async (page: Page) => {
  await page.goto('/');
  await expect(page.getByTestId('user-appbar-button')).toBeVisible({
    timeout: TIMEOUTS.ThirtySeconds,
  });
  await page.getByTestId('user-appbar-button').click();
  await page.getByRole('menuitem').filter({ hasText: 'Log out' }).click();
  await expect(page.getByTestId('login-button')).toBeVisible({
    timeout: TIMEOUTS.ThirtySeconds,
  });
};

export const loginSessionUser = async (page: Page, saveSession = false) => {
  await page.goto('/login');
  await page.getByTestId('text-input-username').fill(SESSION_USER);
  await page.getByTestId('text-input-password').fill(SESSION_PASS);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('user-appbar-button')).toBeVisible({
    timeout: TIMEOUTS.ThirtySeconds,
  });

  try {
    const letsGoButton = page.getByTestId('lets-go-button');
    if (await letsGoButton.isVisible({ timeout: 3000 })) {
      await letsGoButton.click();
    }
  } catch {
    // Modal not visible, skip
  }

  if (saveSession) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const stateFilePath = path.join(__dirname, '..', 'sessionUser.json');
    await page.context().storageState({ path: stateFilePath });
  }
};
