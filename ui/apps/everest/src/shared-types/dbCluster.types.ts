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
import { DbEngineType } from './dbEngines.types';

export enum ProxyExposeType {
  internal = 'internal',
  external = 'external',
}

export enum DbClusterStatus {
  unknown = 'unknown',
  initializing = 'initializing',
  paused = 'paused',
  pausing = 'pausing',
  stopping = 'stopping',
  ready = 'ready',
  error = 'error',
  restoring = 'restoring',
  deleting = 'deleting',
}

export interface Schedule {
  enabled: boolean;
  name: string;
  backupStorageName: string;
  retentionCopies?: number;
  schedule: string;
}

export interface PITR {
  enabled: boolean;
  backupStorageName: string;
}

export interface Backup {
  enabled: boolean;
  pitr?: PITR;
  schedules?: Array<Schedule>;
}

interface Resources {
  cpu: number | string;
  memory: number | string;
}

interface Storage {
  class?: string;
  size: number | string;
}

interface Engine {
  replicas: number;
  resources?: Resources;
  storage: Storage;
  crVersion?: string;
  type: DbEngineType;
  version?: string;
  config?: string;
}

interface Proxy {
  replicas: number;
  expose: {
    type: ProxyExposeType;
    ipSourceRanges?: string[];
  };
}

export interface DataSource {
  dbClusterBackupName: string;
  pitr?: DataSourcePitr;
}

export interface DataSourcePitr {
  date: string;
  type: 'date';
}

export interface Monitoring {
  monitoringConfigName?: string;
}

export interface Spec {
  allowUnsafeConfiguration?: boolean;
  backup?: Backup;
  engine: Engine;
  proxy: Proxy;
  paused?: boolean;
  dataSource?: DataSource;
  monitoring: Monitoring;
}

export interface StatusSpec {
  status: DbClusterStatus;
  hostname: string;
  port: number;
  activeStorage?: string;
  crVersion: string;
  recommendedCRVersion?: string;
}

export interface DbClusterMetadata {
  name: string;
  namespace: string;
  annotations?: {
    'everest.percona.com/restart'?: string;
  };
}

export interface DbCluster {
  apiVersion: string;
  kind: 'DatabaseCluster';
  metadata: DbClusterMetadata;
  spec: Spec;
  status?: StatusSpec;
}

export type GetDbClusterPayload = {
  apiVersion: string;
  items: Array<DbCluster>;
  kind: 'DatabaseCluster';
  metadata: DbClusterMetadata;
};

export type ClusterCredentials = {
  username: string;
  password: string;
};

export type GetDbClusterCredentialsPayload = ClusterCredentials;
