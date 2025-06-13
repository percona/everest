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
import {
  DbCluster,
  GetDbClusterCredentialsPayload,
  GetDbClusterPayload,
} from 'shared-types/dbCluster.types';
import { api } from './api';
import { DBClusterComponentsList } from 'shared-types/components.types';

export const createDbClusterFn = async (data: DbCluster, namespace: string, cluster: string) => {
  const response = await api.post<DbCluster>(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters`,
    data
  );

  return response.data;
};

export const updateDbClusterFn = async (
  dbClusterName: string,
  namespace: string,
  data: DbCluster,
  cluster: string = 'in-cluster'
) => {
  const response = await api.put(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters/${dbClusterName}`,
    data,
    {
      disableNotifications: (e) => e.status === 409,
    }
  );

  return response.data;
};

export const getDbClustersFn = async (cluster: string, namespace: string) => {
  const response = await api.get<GetDbClusterPayload>(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters`
  );
  return response.data;
};

export const getDbClusterCredentialsFn = async (
  dbClusterName: string,
  namespace: string,
  cluster: string
) => {
  const response = await api.get<GetDbClusterCredentialsPayload>(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters/${dbClusterName}/credentials`
  );

  return response.data;
};

export const getDbClusterFn = async (
  dbClusterName: string,
  namespace: string,
  cluster: string
) => {
  const response = await api.get<DbCluster>(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters/${dbClusterName}`,
    {
      disableNotifications: true,
    }
  );
  return response.data;
};

export const deleteDbClusterFn = async (
  dbClusterName: string,
  namespace: string,
  cleanupBackupStorage: boolean,
  cluster: string
) => {
  const response = await api.delete<DbCluster>(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters/${dbClusterName}?cleanupBackupStorage=${cleanupBackupStorage}`
  );
  return response.data;
};

export const getDBClusterComponentsListFn = async (
  namespace: string,
  dbClusterName: string,
  cluster: string
) => {
  const response = await api.get<DBClusterComponentsList>(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters/${dbClusterName}/components`
  );
  return response.data;
};
