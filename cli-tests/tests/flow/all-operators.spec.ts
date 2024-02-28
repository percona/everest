// percona-everest-cli
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
import { faker } from '@faker-js/faker';

test.describe('Everest CLI install', async () => {
  test.beforeEach(async ({ cli }) => {
    await cli.execute('docker-compose -f quickstart.yml up -d --force-recreate --renew-anon-volumes');
    await cli.execute('minikube delete');
    await cli.execute('minikube start');
    // await cli.execute('minikube start --apiserver-name=host.docker.internal');
  });

  test('install all operators', async ({ page, cli, request }) => {
    const verifyClusterResources = async () => {
      await test.step('verify installed operators in k8s', async () => {
        const perconaEverestPodsOut = await cli.exec('kubectl get pods --namespace=everest-system');

        await perconaEverestPodsOut.outContainsNormalizedMany([
          'everest-operator-controller-manager',
        ]);

        const out = await cli.exec('kubectl get pods --namespace=everest-all');

        await out.outContainsNormalizedMany([
          'percona-xtradb-cluster-operator',
          'percona-server-mongodb-operator',
          'percona-postgresql-operator',
        ]);
      });
    };
    const clusterName = `test-${faker.number.int()}`;

    await test.step('run everest install command', async () => {
      const out = await cli.everestExecSkipWizard(
        `install --namespaces=everest-all`,
      );

      await out.assertSuccess();
      await out.outErrContainsNormalizedMany([
        'percona-xtradb-cluster-operator operator has been installed',
        'percona-server-mongodb-operator operator has been installed',
        'percona-postgresql-operator operator has been installed',
        'everest-operator operator has been installed',
      ]);
    });

    await page.waitForTimeout(10_000);

    await verifyClusterResources();

    await test.step('disable telemetry', async () => {
      // check that the telemetry IS NOT disabled by default
      let out = await cli.exec('kubectl get deployments/percona-xtradb-cluster-operator --namespace=everest-all -o yaml');

      await out.outContains(
        'name: DISABLE_TELEMETRY\n          value: "false"',
      );
      out = await cli.exec(`kubectl patch service everest --patch '{"spec": {"type": "LoadBalancer"}}' --namespace=everest-system`)

      await out.assertSuccess();

      out = await cli.everestExecSkipWizardWithEnv('upgrade --namespaces=everest-all', 'DISABLE_TELEMETRY=true');
      await out.assertSuccess();
      await out.outErrContainsNormalizedMany([
        'Subscriptions have been patched\t{"component": "upgrade"}',
      ]);

      await page.waitForTimeout(10_000);
      // check that the telemetry IS disabled
      out = await cli.exec('kubectl get deployments/percona-xtradb-cluster-operator --namespace=everest-all -o yaml');
      await out.outContains(
        'name: DISABLE_TELEMETRY\n          value: "true"',
      );
      // check that the spec.type is not overrided
      out = await cli.exec('kubectl get service/everest --namespace=everest-system -o yaml');
      await out.outContains(
        'type: LoadBalancer',
      );
    });

    await test.step('uninstall Everest', async () => {
      let out = await cli.everestExec(
        `uninstall --assume-yes`,
      );

      await out.assertSuccess();
      // check that the namespace does not exist
      out = await cli.exec('kubectl get ns everest-system everest-monitoring everest-olm everest-all');

      await out.outErrContainsNormalizedMany([
		'Error from server (NotFound): namespaces "everest-system" not found',
		'Error from server (NotFound): namespaces "everest-monitoring" not found',
		'Error from server (NotFound): namespaces "everest-olm" not found',
		'Error from server (NotFound): namespaces "everest-all" not found',
      ]);

    });

  });
});
