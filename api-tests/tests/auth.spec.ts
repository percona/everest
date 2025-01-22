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
import { expect, test } from '@fixtures';
import { checkError } from '@tests/tests/helpers';

test('auth header fails with invalid token', async ({ request }) => {
  const version = await request.get('/v1/version', {
    headers: {
      Authorization: 'Bearer 123',
    },
  });

  expect(version.status()).toEqual(401);
});

test.describe('no authorization header', () => {
  test.use({
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  test('auth header fails with no content', async ({ request }) => {
    const version = await request.get('/v1/version');

    expect(version.status()).toEqual(401);
  });
});
