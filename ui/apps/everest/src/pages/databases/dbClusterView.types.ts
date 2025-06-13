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

import { DbType } from '@percona/types';
import {
  DbCluster,
  DbClusterStatus,
} from 'shared-types/dbCluster.types';
import { DbEngineType } from 'shared-types/dbEngines.types';

export interface DbTypeIconProviderProps {
  dbType: DbEngineType | DbType;
}

export interface DbClusterTableElement {
  cluster: string;
  namespace: string;
  status: DbClusterStatus;
  dbType: DbEngineType;
  dbVersion: string;
  backupsEnabled: boolean;
  databaseName: string;
  cpu: string;
  memory: string;
  storage: string;
  nodes: number;
  proxies: number;
  proxyCpu: string;
  proxyMemory: string;
  hostName: string;
  exposetype?: string;
  port?: number;
  monitoringConfigName: string;
  raw: DbCluster;
}
