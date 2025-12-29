import {
  CI_USER_STORAGE_STATE_FILE,
  SESSION_USER_STORAGE_STATE_FILE,
  TIMEOUTS,
} from '@e2e/constants';
import { Page, expect } from '@playwright/test';
import { getCliPath } from './session-cli';
import { execSync } from 'child_process';

const { CI_USER, CI_PASSWORD } = process.env;
const { SESSION_USER, SESSION_PASS } = process.env;
const cliPath = getCliPath();

export const switchUser = async (
  page: Page,
  user: string,
  password: string,
  storageFile: string = CI_USER_STORAGE_STATE_FILE
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
  await page.context().storageState({ path: storageFile });
};

// Login functions
export const login = async (
  page: Page,
  user: string,
  password: string,
  storageFile?: string
) => {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByTestId('text-input-username').fill(user);
  await page.getByTestId('text-input-password').fill(password);
  await page.getByTestId('login-button').click();

  // await page.waitForURL((url) => !url.pathname.includes('/login'), {
  //   timeout: TIMEOUTS.ThirtySeconds,
  // });

  await expect(page.getByTestId('user-appbar-button')).toBeVisible({
    timeout: TIMEOUTS.TenSeconds,
  });

  try {
    // Disable 'Let's Go' Modal permanently
    await expect(page.getByTestId('lets-go-button')).toBeVisible({
      timeout: 3 * 1000,
    });
    await page.getByTestId('lets-go-button').click();
  } catch {
    // Modal not visible, skip
  }

  const origins = (await page.context().storageState()).origins;
  expect(origins.length).toBeGreaterThan(0);
  expect(
    origins.find(
      (origin) =>
        !!origin.localStorage.find((storage) => storage.name === 'everestToken')
    )
  ).not.toBeUndefined();

  if (storageFile) {
    await page.context().storageState({ path: storageFile });
  }
};

export const loginCIUser = async (page: Page) => {
  await login(page, CI_USER, CI_PASSWORD, CI_USER_STORAGE_STATE_FILE);
};

export const loginSessionUser = async (page: Page) => {
  await login(
    page,
    SESSION_USER,
    SESSION_PASS,
    SESSION_USER_STORAGE_STATE_FILE
  );
};

export const loginTestUser = async (
  page: Page,
  username: string,
  password: string
): Promise<void> => {
  // Clear any existing authentication state before login
  await page.context().clearCookies();
  await page.context().clearPermissions();

  // Clear storage - combine operations to avoid context destruction issues
  try {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    // If storage clearing fails (navigation/context destroyed), continue anyway
    // The cookies/permissions are already cleared
  }

  // Retry login in case of transient server issues during parallel execution
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // page is still valid before attempting login
      if (page.isClosed()) {
        throw new Error('Page has been closed');
      }

      await login(page, username, password);
      await page.waitForLoadState('networkidle');

      // Additional wait for RBAC permissions to be fully applied in the UI
      // This is needed because the UI might still be rendering permission-based components
      await page.waitForTimeout(2000);

      return;
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error;
      }
      if (page.isClosed()) {
        throw error;
      }

      // Retry after a short delay with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      // console.log(`⚠️  Login attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);

      try {
        await page.waitForTimeout(delay);
      } catch {
        throw error;
      }

      // Clear state before retry
      try {
        if (!page.isClosed()) {
          await page.goto('/');
          await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
          });
        }
      } catch {
        // Ignoring errors during cleanup before retry
      }
    }
  }
};

// Logout functions
export const logout = async (page: Page, storageFile?: string) => {
  try {
    await page.goto('/', { timeout: 10000 });
    await expect(page.getByTestId('user-appbar-button')).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId('user-appbar-button').click();
    await page.getByRole('menuitem').filter({ hasText: 'Log out' }).click();

    // Wait for Login page again
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page.getByTestId('login-button')).toBeVisible({
      timeout: 5000,
    });
  } catch (error: any) {
    // console.log('⚠️  Logout flow interrupted, continuing with cleanup');
  }

  // Always cleanup storage even if logout UI flow failed
  try {
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  } catch (error: any) {
    // console.log('⚠️  Storage cleanup skipped (page might be closed)');
  }
  if (storageFile) {
    try {
      await page.context().storageState({ path: storageFile });
    } catch (error: any) {
      // console.log('⚠️  Could not save storage state');
    }
  }
};

export const logoutCIUser = async (page: Page) => {
  await logout(page, CI_USER_STORAGE_STATE_FILE);
};

export const logoutSessionUser = async (page: Page) => {
  await logout(page, SESSION_USER_STORAGE_STATE_FILE);
};

export const logoutTestUser = async (page: Page): Promise<void> => {
  try {
    if (page.isClosed()) {
      // console.log('⚠️  Page already closed, skipping logout');
      return;
    }
    await logout(page);
  } catch (error: any) {
    if (
      error.message?.includes(
        'Target page, context or browser has been closed'
      ) ||
      error.message?.includes('Execution context was destroyed')
    ) {
      // console.log('⚠️  Page closed during logout, cleanup skipped');
      return;
    }
    throw error;
  }
};

export interface RBACTestUser {
  username: string;
  password: string;
  cleanup: () => Promise<void>;
}

export const createRBACTestUser = async (
  testName: string
): Promise<RBACTestUser> => {
  const timestamp = Date.now();
  const sanitizedTestName = testName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30);
  const username = `rbac_${sanitizedTestName}_${timestamp}`;
  const password = `test_${timestamp}`;

  // Retry logic for Kubernetes conflict errors
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      execSync(`${cliPath} accounts create -u ${username} -p ${password}`, {
        stdio: 'pipe',
      });
      console.log(`✓ Created test user: ${username}`);
      lastError = null;
      break;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.stderr?.toString() || error.message || '';

      if (errorMessage.includes('the object has been modified')) {
        // console.log(`⚠️  Retry ${attempt}/5 for user ${username} (conflict detected)`);
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, attempt - 1))
        );
        continue;
      }

      console.error(`Failed to create user ${username}:`, error);
      throw error;
    }
  }

  if (lastError) {
    console.error(
      `Failed to create user ${username} after 5 attempts:`,
      lastError
    );
    throw lastError;
  }

  return {
    username,
    password,
    cleanup: async () => {
      try {
        execSync(`${cliPath} accounts delete -u ${username}`, {
          stdio: 'pipe',
        });
        console.log(`✓ Deleted test user: ${username}`);
      } catch (error) {
        console.warn(`Failed to delete user ${username}:`, error);
      }
    },
  };
};
