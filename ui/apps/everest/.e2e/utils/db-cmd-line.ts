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
import { isShardingEnabled } from '../release/psmdb-sharding.e2e';

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
  console.log('Starting MongoDB sharding configuration...');

  // Enable sharding for the database

  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.enableSharding(\\"test\\");'
  );

  // Shard t1
  await queryPSMDB(cluster, namespace, 'test', 'db.t1.createIndex({ a: 1 });');

  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.shardCollection(\\"test.t1\\", { a: 1 });'
  );

  // Manually split chunks for t1

  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.splitAt(\\"test.t1\\", { a: 2 });'
  );

  // Move chunks for t1
  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.moveChunk(\\"test.t1\\", { a: MinKey }, \\"rs0\\");'
  );
  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.moveChunk(\\"test.t1\\", { a: 2 }, \\"rs1\\");'
  );

  // Shard t2
  await queryPSMDB(cluster, namespace, 'test', 'db.t2.createIndex({ b: 1 });');

  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.shardCollection(\\"test.t2\\", { b: 1 });'
  );
  // Manually split chunks for t2
  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.splitAt(\\"test.t2\\", { b: 2 });'
  );
  // Move chunks for t2
  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.moveChunk(\\"test.t2\\", { b: MinKey }, \\"rs0\\");'
  );

  await queryPSMDB(
    cluster,
    namespace,
    'admin',
    'sh.moveChunk(\\"test.t2\\", { b: 2 }, \\"rs1\\");'
  );
  console.log('MongoDB sharding configuration completed successfully.');
};

export const validateMongoDBSharding = async (
  cluster: string,
  namespace: string
) => {
  console.log('Validating MongoDB sharding...');
  // Collection t1
  // Fetch UUID for test.t1
  const t1CollectionString = await queryPSMDB(
    cluster,
    namespace,
    'config',
    'db.collections.find({ _id: \\"test.t1\\" });'
  );

  // Parse string to valid JavaScript object t1Collection
  console.log('t1 Collection String:', t1CollectionString);
  const t1Collection = eval(
    t1CollectionString.replace(/ObjectId|ISODate|UUID|Timestamp/g, '')
  );

  // Extract uuid of test.t1 collection
  const t1UUID = t1Collection[0]?.uuid;
  console.log('t1 UUID:', t1UUID);

  console.log('Fetching chunks for collection t1...');

  // Fetch chunks for test.t1 using UUID
  const t1query = `db.chunks.aggregate([
    { \\$match: { uuid: UUID(\\"${t1UUID}\\") } },
    { \\$group: { _id: \\"\\$shard\\" } }
  ]).toArray();`;

  const t1result = await queryPSMDB(cluster, namespace, 'config', t1query);
  console.log('t1 Chunks Result:', t1result);

  // Preprocess the string to make it valid JSON
  const t1sanitizedResult = t1result
    .replace(/_id/g, '"_id"')
    .replace(/'/g, '"');

  // Parse the string to convert it into a JavaScript array
  const t1chunks = JSON.parse(t1sanitizedResult);
  console.log('t1 Chunks:', t1chunks);

  // Extract the shard IDs (rs0 and rs1)
  const t1shardIds = t1chunks.map((chunk: { _id: string }) => chunk._id);
  console.log('t1 Shard IDs:', t1shardIds);

  // Check if specific shard IDs exist
  const t1hasRs0 = t1shardIds.includes('rs0');
  const t1hasRs1 = t1shardIds.includes('rs1');

  // Assert that both shards are present

  // Log results of shard existence checks
  console.log('Does t1 have shard rs0?:', t1hasRs0);
  console.log('Does t1 have shard rs1?:', t1hasRs1);

  expect(t1hasRs0).toBe(true);
  expect(t1hasRs1).toBe(true);

  // Collection t2
  // Fetch UUID for test.t2
  const t2CollectionString = await queryPSMDB(
    cluster,
    namespace,
    'config',
    'db.collections.find({ _id: \\"test.t2\\" });'
  );
  console.log('t2 Collection String:', t2CollectionString);
  // Parse string to valid JavaScript object t2Collection
  const t2Collection = eval(
    t2CollectionString.replace(/ObjectId|ISODate|UUID|Timestamp/g, '')
  );

  // Extract uuid of test.t2 collection
  const t2UUID = t2Collection[0]?.uuid;
  console.log('t2 UUID:', t2UUID);

  console.log('Fetching chunks for collection t2...');

  // Fetch chunks for test.2 using UUID
  const t2query = `db.chunks.aggregate([
    { \\$match: { uuid: UUID(\\"${t2UUID}\\") } },
    { \\$group: { _id: \\"\\$shard\\" } }
  ]).toArray();`;

  const t2result = await queryPSMDB(cluster, namespace, 'config', t2query);
  console.log('t2 Chunks Result:', t2result);

  // Preprocess the string to make it valid JSON
  const t2sanitizedResult = t2result
    .replace(/_id/g, '"_id"')
    .replace(/'/g, '"');

  // Parse the string to convert it into a JavaScript array
  const t2chunks = JSON.parse(t2sanitizedResult);

  // Extract the shard IDs (rs0 and rs1)
  const t2shardIds = t2chunks.map((chunk: { _id: string }) => chunk._id);

  // Check if specific shard IDs exist
  console.log('t2 Shard IDs:', t2shardIds);
  const t2hasRs0 = t2shardIds.includes('rs0');
  const t2hasRs1 = t2shardIds.includes('rs1');

  // Assert that both shards are present
  console.log('t2 Shard IDs:', t2shardIds);
  expect(t2hasRs0).toBe(true);
  expect(t2hasRs1).toBe(true);
  console.log('MongoDB sharding validation complete.');
};
