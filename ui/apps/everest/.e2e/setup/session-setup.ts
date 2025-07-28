import { test } from '@playwright/test';
import { execSync } from 'child_process';
import { loginSessionUser } from '../utils/user';
import { getCliPath } from '../utils/session-cli';

const USER = process.env.SESSION_USER!;
const PASS = process.env.SESSION_PASS!;

const cliPath = getCliPath();

test('Setup session user and generate sessionUser.json', async () => {
  console.log('Creating test user via CLI...');

  if (!USER || !PASS) {
    throw new Error('SESSION_USER or SESSION_PASS is not set');
  }
  execSync(
    `go run ${cliPath} accounts create -u ${USER} -p ${PASS}`,
    {
      stdio: 'inherit',
    }
  );
});

test('Login Everest and generate sessionUser.json', async ({ page }) => {
  await loginSessionUser(page, true);
});
