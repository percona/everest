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
import { isShardingEnabled } from '../release/demand-backup-psmdb-sharding.e2e';

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

  // Ensure sharding flag is properly handled
  isShardingEnabled == true;
  const replicaSetOption = isShardingEnabled ? '' : '&replicaSet=rs0';
  try {
    const command = `kubectl exec --namespace db-client ${clientPod} -- mongosh "mongodb://backup:${password}@${host}/${db}?authSource=admin${replicaSetOption}" --eval "${query}"`;
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

export const insertMoreTestDB = async (cluster: string, namespace: string) => {
  const dbType = await getDBType(cluster, namespace);

  switch (dbType) {
    case 'pxc': {
      await queryMySQL(
        cluster,
        namespace,
        'INSERT INTO test.t1 VALUES (4),(5),(6);'
      );
      const result = await queryTestDB(cluster, namespace);
      expect(result.trim()).toBe('1\n2\n3\n4\n5\n6');
      break;
    }
    case 'psmdb': {
      await queryPSMDB(
        cluster,
        namespace,
        'test',
        'db.t1.insertMany([{ a: 4 }, { a: 5 }, { a: 6 }]);'
      );
      const result = await queryTestDB(cluster, namespace);
      expect(result.trim()).toBe(
        '[ { a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }, { a: 6 } ]'
      );
      break;
    }
    case 'postgresql': {
      await queryPG(
        cluster,
        namespace,
        'test',
        'INSERT INTO t1 VALUES (4),(5),(6);'
      );
      const result = await queryTestDB(cluster, namespace);
      expect(result.trim()).toBe('1\n 2\n 3\n 4\n 5\n 6');
      break;
    }
  }
};

export const pgInsertDummyTestDB = async (
  cluster: string,
  namespace: string
) => {
  await queryPG(
    cluster,
    namespace,
    'test',
    'INSERT INTO t1 VALUES (7),(8),(9);'
  );
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

export const queryTestDB = async (
  cluster: string,
  namespace: string,
  collection: string = 't1' // Default to collection `t1`
) => {
  const dbType = await getDBType(cluster, namespace);
  let result: string;

  switch (dbType) {
    case 'pxc': {
      result = await queryMySQL(cluster, namespace, 'SELECT * FROM test.t1;');
      break;
    }
    case 'psmdb': {
      const sortField = collection === 't1' ? 'a' : 'b';
      result = await queryPSMDB(
        cluster,
        namespace,
        'test',
        `db.${collection}.find({},{_id: 0}).sort({${sortField}: 1}).toArray();`
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

export const prepareMongoDBTestDB = async (
  cluster: string,
  namespace: string
) => {
  await dropTestDB(cluster, namespace);

  // Insert test data into the collection t1 and t2
  await queryPSMDB(
    cluster,
    namespace,
    'test',
    'db.t1.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);'
  );

  await queryPSMDB(
    cluster,
    namespace,
    'test',
    'db.t2.insertMany([{ b: 1 }, { b: 2 }, { b: 3 }]);'
  );
};

export const configureMongoDBSharding = async (
  cluster: string,
  namespace: string
) => {
  // Enable sharding for the database
  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.enableSharding(\\"test\\");'
  );

  // Sets up indexes and sharding for t1 and t2 collections.
  await queryPSMDB(cluster, namespace, 'test', 'db.t1.createIndex({ a: 1 });');

  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.shardCollection(\\"test.t1\\", { a: 1 });'
  );

  await queryPSMDB(cluster, namespace, 'test', 'db.t2.createIndex({ b: 1 });');

  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.shardCollection(\\"test.t2\\", { b: 1 });'
  );
};

export const validateMongoDBSharding = async (
  cluster: string,
  namespace: string
) => {
  // Check if sharding is enabled for the database
  const shardingStatus = await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.status();'
  );

  console.log('Sharding Status:', shardingStatus);

  // Query the config.collections to verufy t1 and t2 are sharded

  const t1Collection = await queryPSMDB(
    cluster,
    namespace,
    'config',
    'db.collections.find({ _id: \\"test.t1\\" }).toArray();'
  );

  const t2Collection = await queryPSMDB(
    cluster,
    namespace,
    'config',
    'db.collections.find({ _id: \\"test.t2\\" }).toArray();'
  );

  console.log('t1 collection:', t1Collection);
  console.log('t2 collection:', t2Collection);

  // Validate the chunk in config.chunks for t1 and t2 collections
  const t1Chunks = await queryPSMDB(
    cluster,
    namespace,
    'config',
    'db.chunks.find({ ns: \\"test.t1\\" }).toArray();'
  );

  const t2Chunks = await queryPSMDB(
    cluster,
    namespace,
    'config',
    'db.chunks.find({ ns: \\"test.t2\\" }).toArray();'
  );

  // Log distribution for debugging purposes
  console.log('t1 chunk:', t1Chunks);
  console.log('t2 chunk:', t2Chunks);

  // Validate t1, t2 collections and chunks are not empty
  expect(JSON.parse(t1Collection).length).toBeGreaterThan(0);
  expect(JSON.parse(t2Collection).length).toBeGreaterThan(0);

  expect(JSON.parse(t1Chunks).length).toBeGreaterThan(0);
  expect(JSON.parse(t2Chunks).length).toBeGreaterThan(0);
};
