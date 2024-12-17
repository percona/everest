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

import { APIRequestContext, expect } from '@playwright/test';
import { execSync } from 'child_process';

export const checkError = async (response) => {
  if (!response.ok()) {
    console.log(`${response.url()}: `, await response.json());
  }
  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();
};

export const getDBClustersList = async (namespace: string, request: APIRequestContext, token) => {
  const response = await request.get(
    `/v1/namespaces/${namespace}/database-clusters`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  await checkError(response);

  return response.json();
};

export const getDBCluster = async (clusterName: string, namespace: string, request: APIRequestContext, token: string) => {
  const dbClusters = (await getDBClustersList(namespace, request, token)).items;

  const fetchedCluster = dbClusters.find(
    (cluster) => cluster.metadata.name === clusterName
  );
  expect(fetchedCluster).not.toBeUndefined();

  return fetchedCluster;
};

export const updateDBCluster = async (clusterName: string, namespace: string, payload: object, request: APIRequestContext) => {
  const updatedCluster = await request.put(
    `/v1/namespaces/${namespace}/database-clusters/${clusterName}`,
    {
      data: payload,
    }
  );
  await checkError(updatedCluster);
};

export const getVersionServiceURL = async () => {
  try {
    const command = `kubectl get deployment everest-server --namespace everest-system -o jsonpath="{.spec.template.spec.containers[0].env[?(@.name=='VERSION_SERVICE_URL')].value}"`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const checkIfDBUpgradeAvailable = async (cluster: string, namespace: string) => {
  try {
    const command = `kubectl get --namespace ${namespace} DatabaseClusters ${cluster} -ojsonpath='{.status.hostname}'`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};