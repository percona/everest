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
import { getCITokenFromLocalStorage } from '../utils/localStorage';
import { getBucketNamespacesMap } from '../constants';
import {
  deleteMonitoringInstance,
  listMonitoringInstances,
} from '@e2e/utils/monitoring-instance';

teardown.describe.serial('Monitoring Instances teardown', () => {
  teardown('Delete Monitoring Instances', async ({ request }) => {
    const token = await getCITokenFromLocalStorage();
    const bucketNamespacesMap = getBucketNamespacesMap();
    const allNamespaces = Array.from(
      new Set(bucketNamespacesMap.map(([, namespaces]) => namespaces).flat())
    );
    const promises: Promise<any>[] = [];

    for (const [idx, namespace] of allNamespaces.entries()) {
      const monitoringInstances = await listMonitoringInstances(
        request,
        namespace,
        token
      );
      for (const instance of monitoringInstances) {
        promises.push(
          deleteMonitoringInstance(request, namespace, instance.name, token)
        );
      }
    }
    await Promise.all(promises);
  });
});
