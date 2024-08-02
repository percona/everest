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

import { Page, expect } from '@playwright/test';

/**
 * Selects the required DB resources in db wizard and checks if the calculation of total amount
 * of resources is correct
 * @param page Page object
 * @param cpu Requested CPU amount
 * @param memory Requested memory amount in GB
 * @param disk Requested disk size in Gb
 * @param clusterSize Number of nodes in DB cluster
 */
export const resourcesStepCheck = async (
  page: Page,
  cpu: number,
  memory: number,
  disk: number,
  clusterSize: number
) => {
  await expect(page.getByTestId('step-header')).toBeVisible();
  await expect(page.getByTestId('step-description')).toBeVisible();

  await page.getByTestId('toggle-button-large').click();
  await page.getByTestId('text-input-cpu').fill(cpu.toString());
  await page.getByTestId('text-input-memory').fill(memory.toString());
  await page.getByTestId('text-input-disk').fill(disk.toString());

  const expectedCpuText = ` = ${(cpu * clusterSize).toFixed(2)} CPU`;
  const expectedMemoryText = ` = ${(memory * clusterSize).toFixed(2)} GB`;
  const expectedDiskText = ` = ${(disk * clusterSize).toFixed(2)} GB`;

  let nodesText =
    clusterSize == 1 ? `x ${clusterSize} node` : `x ${clusterSize} nodes`;
  expect(await page.getByText(nodesText).count()).toBe(3);
  await expect(page.getByTestId('cpu-resource-sum')).toHaveText(
    expectedCpuText
  );
  await expect(page.getByTestId('memory-resource-sum')).toHaveText(
    expectedMemoryText
  );
  await expect(page.getByTestId('disk-resource-sum')).toHaveText(
    expectedDiskText
  );
};
