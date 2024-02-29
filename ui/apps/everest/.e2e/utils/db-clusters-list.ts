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

import { APIRequestContext, expect, Page } from '@playwright/test';
import { findRowAndClickActions } from './table';

export const getDBClustersList = async (
  token: string,
  request: APIRequestContext
) => {
  const response = await request.get('/v1/database-clusters', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
};

export const findDbAndClickRow = async (page: Page, dbName: string) => {
  const dbRow = page.getByRole('row').filter({ hasText: dbName });
  page.getByTestId(`${dbName}-status`).filter({ hasText: 'Initializing' });

  await dbRow.click();
};

export const findDbAndClickActions = async (
  page: Page,
  dbName: string,
  nameOfAction?: string
) => {
  page.getByTestId(`${dbName}-status`).filter({ hasText: 'Initializing' });
  await findRowAndClickActions(page, dbName, nameOfAction);
};
