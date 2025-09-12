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

import { test as teardown } from '@playwright/test';
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { logout } from '../utils/user';
import { getBucketNamespacesMap } from '../constants';
import {
  deleteMonitoringInstance,
  listMonitoringInstances,
} from '@e2e/utils/monitoring-instance';

teardown.describe.serial('Global teardown', () => {
  // teardown('Delete backup storage', async ({ request }) => {
  //   const token = await getTokenFromLocalStorage();
  //   const promises = [];
  //   const bucketNamespacesMap = getBucketNamespacesMap();
  //
  //   bucketNamespacesMap.forEach(([bucket, namespace]) => {
  //     promises.push(
  //       request.delete(
  //         `/v1/namespaces/${namespace}/backup-storages/${bucket}`,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       )
  //     );
  //   });
  //
  //   // STORAGE_NAMES.forEach(async (name) => {
  //   //   promises.push(
  //   //     request.delete(`/v1/backup-storages/${name}`, {
  //   //       headers: {
  //   //         Authorization: `Bearer ${token}`,
  //   //       },
  //   //     })
  //   //   );
  //   // });
  //
  //   await Promise.all(promises);
  // });
  //
  // teardown('Delete monitoring instances', async ({ request }) => {
  //   const token = await getTokenFromLocalStorage();
  //   const bucketNamespacesMap = getBucketNamespacesMap();
  //   const allNamespaces = Array.from(
  //     new Set(bucketNamespacesMap.map(([, namespaces]) => namespaces).flat())
  //   );
  //
  //   for (const [idx, namespace] of allNamespaces.entries()) {
  //     const monitoringInstances = await listMonitoringInstances(
  //       request,
  //       namespace,
  //       token
  //     );
  //     for (const instance of monitoringInstances) {
  //       await deleteMonitoringInstance(
  //         request,
  //         namespace,
  //         instance.name,
  //         token
  //       );
  //     }
  //   }
  // });
  //
  // // teardown('Delete monitoring instances', async ({ request }) => {
  // //   await deleteMonitoringInstance(request, testMonitoringName);
  // //   await deleteMonitoringInstance(request, testMonitoringName2);
  // // });
  //
  // teardown('Logout', async ({ page }) => {
  //   await logout(page);
  // });
});
