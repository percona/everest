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
import { login, logout } from '../utils/user';
import { getTokenFromLocalStorage } from '../utils/localStorage';

// ——————————————————————————————————————————————————
// check API response for valid and invalid tokens
async function expectAuthorized(request, token: string) {
  const res = await request.get('/v1/version', {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('version');
}

async function expectUnauthorized(request, token: string) {
  const res = await request.get('/v1/version', {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(res.status()).toBe(401);
  const body = await res.json();
expect(body.message).toMatch(/invalid token|invalid or expired jwt/i);
}
// ——————————————————————————————————————————————————

test('Everest-191 - Verify token invalidity after user logout from Everest UI - Everest user', async ({ page, request }) => {
  const token = await getTokenFromLocalStorage();

  await test.step('Token works before logout', () =>
    expectAuthorized(request, token)
  );

  await test.step('Perform UI logout', () => logout(page));

  await test.step('Token invalid after logout', () =>
    expectUnauthorized(request, token)
  );
  await test.step('Re-log in to refresh storageState for teardown', async () => {
    await login(page);
  });
});