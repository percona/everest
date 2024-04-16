# Percona everest API integration tests

## Before running tests

Before running tests one needs to have provisioned kubernetes cluster, Everest API Server

Running Percona Everest API Server. Run these commands in the root of the project

```
   make local-env-up
   make run-debug
```
Running minikube cluster:

**Linux**
```
   make k8s
```
**MacOS**
```
   make k8s-macos
```
Provisioning kubernetes cluster

```
    make build-cli
    ./bin/everestctl install --version 0.0.0 --version-metadata-url https://check-dev.percona.com --namespaces everest --operator.mongodb=true --operator.postgresql=true --operator.xtradb-cluster=true --skip-wizard
```
Using these commands you'll build the latest dev version of Everest and will have installed the following operators

1. Postgres operator
2. PXC operator
3. PSMDB operator
4. Everest operator

Make sure all the operators are running:
```
kubectl get dbengines -n everest
```
if not - wait until they do.

After these commands you're ready to run integration tests

## Running integration tests
There are several ways running tests
```
  npx playwright test
    Runs the end-to-end tests.

  npx playwright test tests/test.spec.ts
    Runs the specific tests.

  npx playwright test --ui
    Starts the interactive UI mode.

  npx playwright test --debug
    Runs the tests in debug mode.

  npx playwright codegen
    Auto generate tests with Codegen.
```

or
```
   make init
   make test
```

## CLI commands

There is a `cli` entity which is accessible during test and allows executing CLI commands on the host

Example usage:
```javascript

import { test, expect } from '@fixtures';

test('check mongodb-operator is installed', async ({ cli }) => {
    const output = await cli.execSilent('kubectl get pods --namespace=everest');
    await output.assertSuccess();
    await output.outContains('mongodb-operator');
});
```
