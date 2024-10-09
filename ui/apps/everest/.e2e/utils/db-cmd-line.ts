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

import { execSync } from 'child_process';
import { expect } from '@playwright/test';

export const getDBHost = async (cluster: string, namespace: string) => {
  try {
    const command = `kubectl get --namespace ${namespace} DatabaseClusters ${cluster} -ojsonpath='{.status.hostname}'`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const getDBType = async (cluster: string, namespace: string) => {
  try {
    const command = `kubectl get --namespace ${namespace} DatabaseClusters ${cluster} -ojsonpath='{.spec.engine.type}'`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const getDBClientPod = async (dbType: string, namespace: string) => {
  try {
    const command = `kubectl get pods --namespace ${namespace} --selector=name=${dbType}-client -o 'jsonpath={.items[].metadata.name}'`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const getPXCPassword = async (cluster: string, namespace: string) => {
  try {
    const command = `kubectl get secret --namespace ${namespace} everest-secrets-${cluster} -o template='{{ .data.root | base64decode }}'`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const getPSMDBPassword = async (cluster: string, namespace: string) => {
  try {
    const command = `kubectl get secret --namespace ${namespace} everest-secrets-${cluster} -o template='{{ .data.MONGODB_BACKUP_PASSWORD | base64decode }}'`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const getPGPassword = async (cluster: string, namespace: string) => {
  try {
    const command = `kubectl get secret --namespace ${namespace} everest-secrets-${cluster} -o template='{{ .data.password | base64decode }}'`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const queryMySQL = async (
  cluster: string,
  namespace: string,
  query: string
) => {
  const password = await getPXCPassword(cluster, namespace);
  const host = await getDBHost(cluster, namespace);
  const clientPod = await getDBClientPod('mysql', 'db-client');

  try {
    const command = `kubectl exec --namespace db-client ${clientPod} -- mysqlsh root@${host} -p'${password}' --sql --quiet-start=2 -e '${query}' | tail -n +2`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const queryPSMDB = async (
  cluster: string,
  namespace: string,
  db: string,
  query: string
) => {
  const password = await getPSMDBPassword(cluster, namespace);
  const host = await getDBHost(cluster, namespace);
  const clientPod = await getDBClientPod('psmdb', 'db-client');

  try {
    const command = `kubectl exec --namespace db-client ${clientPod} -- mongosh "mongodb://backup:${password}@${host}/${db}?authSource=admin&replicaSet=rs0" --eval "${query}"`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const queryPG = async (
  cluster: string,
  namespace: string,
  db: string,
  query: string
) => {
  const password = await getPGPassword(cluster, namespace);
  const host = await getDBHost(cluster, namespace);
  const clientPod = await getDBClientPod('postgresql', 'db-client');

  try {
    const command = `kubectl exec --namespace db-client ${clientPod} -- bash -c "PGPASSWORD='${password}' psql -h${host} -p5432 -Upostgres -d${db} -t -q -c'${query}'"`;
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    console.error(`Error executing command: ${error}`);
    throw error;
  }
};

export const prepareTestDB = async (cluster: string, namespace: string) => {
  const dbType = await getDBType(cluster, namespace);

  switch (dbType) {
    case 'pxc': {
      await dropTestDB(cluster, namespace);
      await queryMySQL(
        cluster,
        namespace,
        'CREATE DATABASE test; CREATE TABLE test.t1 (a INT PRIMARY KEY); INSERT INTO test.t1 VALUES (1),(2),(3);'
      );
      const result = await queryTestDB(cluster, namespace);
      expect(result.trim()).toBe('1\n2\n3');
      break;
    }
    case 'psmdb': {
      await dropTestDB(cluster, namespace);
      await queryPSMDB(
        cluster,
        namespace,
        'test',
        'db.t1.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);'
      );
      const result = await queryTestDB(cluster, namespace);
      expect(result.trim()).toBe('[ { a: 1 }, { a: 2 }, { a: 3 } ]');
      break;
    }
    case 'postgresql': {
      await dropTestDB(cluster, namespace);
      await queryPG(cluster, namespace, 'postgres', 'CREATE DATABASE test;');
      await queryPG(
        cluster,
        namespace,
        'test',
        'CREATE TABLE t1 (a INT PRIMARY KEY); INSERT INTO t1 VALUES (1),(2),(3);'
      );
      const result = await queryTestDB(cluster, namespace);
      expect(result.trim()).toBe('1\n 2\n 3');
      break;
    }
  }
};

export const dropTestDB = async (cluster: string, namespace: string) => {
  const dbType = await getDBType(cluster, namespace);

  switch (dbType) {
    case 'pxc': {
      await queryMySQL(cluster, namespace, 'DROP DATABASE IF EXISTS test;');
      const result = await queryMySQL(cluster, namespace, 'SHOW DATABASES;');
      expect(result).not.toContain('test');
      break;
    }
    case 'psmdb': {
      await queryPSMDB(cluster, namespace, 'test', 'db.dropDatabase();');
      const result = await queryPSMDB(cluster, namespace, 'admin', 'show dbs;');
      expect(result).not.toContain('test');
      break;
    }
    case 'postgresql': {
      await queryPG(
        cluster,
        namespace,
        'postgres',
        'DROP DATABASE IF EXISTS test WITH (FORCE);'
      );
      const result = await queryPG(cluster, namespace, 'postgres', '\\list');
      expect(result).not.toContain('test');
      break;
    }
  }
};

export const queryTestDB = async (cluster: string, namespace: string) => {
  const dbType = await getDBType(cluster, namespace);
  let result: string;

  switch (dbType) {
    case 'pxc': {
      result = await queryMySQL(cluster, namespace, 'SELECT * FROM test.t1;');
      break;
    }
    case 'psmdb': {
      result = await queryPSMDB(
        cluster,
        namespace,
        'test',
        'db.t1.find({},{_id: 0}).sort({a: 1});'
      );
      break;
    }
    case 'postgresql': {
      result = await queryPG(cluster, namespace, 'test', 'SELECT * FROM t1;');
      break;
    }
  }
  return result;
};
