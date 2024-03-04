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
import { test } from '@fixtures';
// eslint-disable-next-line import/no-extraneous-dependencies


test.describe('Everest CLI install operators', async () => {
  test('install all operators', async ({ page, cli, request }) => {
    await test.step('disable telemetry', async () => {
      // check that the telemetry IS NOT disabled by default
      let out = await cli.exec('kubectl get deployments/percona-xtradb-cluster-operator --namespace=percona-everest -o yaml');

      await out.outContains(
        'name: DISABLE_TELEMETRY\n          value: "false"',
      );

      out = await cli.everestExecSkipWizardWithEnv('upgrade', 'DISABLE_TELEMETRY=true');
      await out.assertSuccess();
      await out.outErrContainsNormalizedMany([
        'Subscriptions have been patched\t{"component": "upgrade"}',
      ]);
      // check that the telemetry IS disabled
      out = await cli.exec('kubectl get deployments/percona-xtradb-cluster-operator --namespace=percona-everest -o yaml');
      await out.outContains(
        'name: DISABLE_TELEMETRY\n          value: "true"',
      );
    });
  });
});
