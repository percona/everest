// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions ands
// limitations under the License.

import { test, expect } from '@playwright/test';
import { loginSessionUser, logout } from '../utils/user';
import { getSessionToken } from '../utils/localStorage';
import { execSync } from 'child_process';
const USER = process.env.SESSION_USER!;

// ——————————————————————————————————————————————————
// check API response for valid and invalid tokens
async function expectAuthorized(request, token: string) {
  const res = await request.get('/v1/version', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('version');
}

async function expectUnauthorized(request, token: string) {
  const res = await request.get('/v1/version', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.message).toMatch(/invalid token|invalid or expired jwt/i);
}
// ——————————————————————————————————————————————————

test('T191 - Verify token invalidity after user logout from Everest UI - Everest user', async ({
  page,
  request,
}) => {
  const token = await getSessionToken();

  await test.step('Token works before logout', () =>
    expectAuthorized(request, token));

  await test.step('Perform UI logout', () => logout(page));

  await test.step('Token invalid after logout', () =>
    expectUnauthorized(request, token));
});

test('T189 - Verify user is logged out and token is invalidated after user deletion', async ({ page, request }) => {
  let token: string;

  await test.step('Login as session user', async () => {
    await loginSessionUser(page, true);
    token = await getSessionToken();
    expect(token).toBeTruthy();
  });

  await test.step('Token works before logout', () =>
    expectAuthorized(request, token));

   await test.step('Delete user and verify UI logout', async () => {
    // Confirm user is logged in
    await expect(page.getByTestId('user-appbar-button')).toBeVisible();

    // Delete user via CLI
    execSync(`go run ../../../cmd/cli/main.go accounts delete -u ${USER}`, {
      stdio: 'inherit',
    });

    // After delete, UI should auto-logout
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page.getByTestId('login-button')).toBeVisible();
  });

  await test.step('Token invalid after logout', () =>
    expectUnauthorized(request, token));
});