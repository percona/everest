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

  await dbRow.click();
};

export const findDbAndClickActions = async (
  page: Page,
  dbName: string,
  nameOfAction?: string,
  status?: string
) => {
  page
    .getByTestId(`${dbName}-status`)
    .filter({ hasText: status || 'Initializing' });
  await findRowAndClickActions(page, dbName, nameOfAction);
};

export const gotoDbClusterBackups = async (page: Page, clusterName: string) => {
  await page.goto('databases');
  await page.getByRole('row').filter({ hasText: clusterName }).click();
  await expect(page.getByText('Overview')).toBeVisible();
  await page.getByTestId('backups').click();
};

export const deleteDbCluster = async (page: Page, clusterName: string) => {
  await page.goto('databases');
  await findDbAndClickActions(page, clusterName, 'delete', 'Up');
  await expect(page.getByText('Delete database')).toBeVisible();
  await expect(page.getByText('Irreversible action')).toBeVisible();
  await page.getByTestId('text-input-confirm-input').fill(clusterName);
  await page.getByTestId('form-dialog-delete').click();
};

export const suspendDbCluster = async (page: Page, clusterName: string) => {
  await page.goto('databases');
  await findDbAndClickActions(page, clusterName, 'suspend', 'Up');
};

export const resumeDbCluster = async (page: Page, clusterName: string) => {
  await page.goto('databases');
  await findDbAndClickActions(page, clusterName, 'resume', 'Paused');
};

export const restartDbCluster = async (page: Page, clusterName: string) => {
  await page.goto('databases');
  await findDbAndClickActions(page, clusterName, 'restart', 'Up');
};
