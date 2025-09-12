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
// See the License for the specific language governing permissions and
// limitations under the License.

import { test as setup } from '@playwright/test';
import { loginCIUser } from '@e2e/utils/user';

setup.describe.serial('Auth setup', () => {
  setup('Login', async ({ page }) => {
    await loginCIUser(page);
    await page.evaluate(() => {
      // This is a dummy token
      localStorage.setItem(
        'everestToken',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJldmVyZXN0IiwiaWF0IjoxNzM5NDU2NjU1LCJleHAiOjE3NzA5OTI2NTUsImF1ZCI6Ind3dy5leGFtcGxlLmNvbSIsInN1YiI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJHaXZlbk5hbWUiOiJKb2hubnkiLCJTdXJuYW1lIjoiUm9ja2V0IiwiRW1haWwiOiJqcm9ja2V0QGV4YW1wbGUuY29tIiwiUm9sZSI6WyJNYW5hZ2VyIiwiUHJvamVjdCBBZG1pbmlzdHJhdG9yIl19.NKJwQE1KY9srM9bZPZxL3zd_563ugnELMPFal9lFf78'
      );
    });
    // Wait for the user to be logged out and end up in login page again
    await page.waitForURL(/login/);
    await loginCIUser(page);
  });
});
