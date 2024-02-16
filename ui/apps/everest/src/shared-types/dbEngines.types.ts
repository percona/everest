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
export enum DbEngineType {
  PSMDB = 'psmdb',
  PXC = 'pxc',
  POSTGRESQL = 'postgresql',
}

export enum DbEngineStatus {
  INSTALLED = 'installed',
  NOT_INSTALLED = 'not installed',
}

export enum DbEngineToolStatus {
  AVAILABLE = 'available',
  RECOMMENDED = 'recommended',
}

export type EngineToolPayload = {
  description: string;
  imagePath: string;
  imageHash: string;
  status: DbEngineToolStatus;
};

export type GetDbEnginesPayload = {
  items: Array<{
    spec: {
      type: DbEngineType;
    };
    status?: {
      status: DbEngineStatus;
      availableVersions: {
        backup: Record<string, EngineToolPayload>;
        engine: Record<string, EngineToolPayload>;
        proxy: Record<string, EngineToolPayload>;
      };
      operatorVersion: string;
    };
  }>;
};

type DbEngineTool = {
  version: string;
} & EngineToolPayload;

export type DbEngine = {
  type: DbEngineType;
  status: DbEngineStatus;
  operatorVersion: string;
  availableVersions: {
    backup: DbEngineTool[];
    engine: DbEngineTool[];
    proxy: DbEngineTool[];
  };
};
