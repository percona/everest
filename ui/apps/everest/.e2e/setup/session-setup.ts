import { test } from '@playwright/test';
import { execSync } from 'child_process';
import { loginSessionUser } from '../utils/user';

const USER = process.env.SESSION_USER!;
const PASS = process.env.SESSION_PASS!;

test('Setup session user and generate sessionUser.json', async () => {
  console.log('Creating test user via CLI...');

  if (!USER || !PASS) {
    throw new Error('SESSION_USER or SESSION_PASS is not set');
  }
  execSync(
    `go run ../../../cmd/cli/main.go accounts create -u ${USER} -p ${PASS}`,
    {
      stdio: 'inherit',
    }
  );
});

test('Login Everest and generate sessionUser.json', async ({ page }) => {
  await loginSessionUser(page, true);
});
