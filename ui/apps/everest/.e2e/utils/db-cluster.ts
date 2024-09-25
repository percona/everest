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
import { dbTypeToDbEngine } from '@percona/utils';
import { getEnginesVersions } from './database-engines';
import { getClusterDetailedInfo } from './storage-class';
import { getTokenFromLocalStorage } from './localStorage';
import { getNamespacesFn } from './namespaces';

export const createDbClusterFn = async (
  request: APIRequestContext,
  customOptions?,
  desiredNamespace?: string
) => {
  const token = await getTokenFromLocalStorage();
  const namespaces = await getNamespacesFn(token, request);
  const namespace = desiredNamespace ?? namespaces[0];
  const dbEngines = await getEnginesVersions(token, namespace, request);
  const dbType = customOptions?.dbType || 'mysql';
  const dbEngineType = dbTypeToDbEngine(dbType);
  const dbTypeVersions = dbEngines[dbEngineType];
  const dbClusterInfo = await getClusterDetailedInfo(token, request);
  const storageClassNames = dbClusterInfo?.storageClassNames[0];
  const lastVersion = dbTypeVersions[dbTypeVersions.length - 1];

  // const payload: DbCluster = {
  //         proxy: {
  //             replicas: +customOptions?.numberOfNodes || 1,
  //             expose: {
  //                 type:
  //                     customOptions?.externalAccess || false
  //                         ? ProxyExposeType.external
  //                         : ProxyExposeType.internal,
  //                 ...(!!(customOptions?.externalAccess || false) &&
  //                     (customOptions?.sourceRange || ['181.170.213.40']) && {
  //                         ipSourceRanges: [customOptions?.sourceRange] || [
  //                             '181.170.213.40',
  //                         ],
  //                     }),
  //             },
  //         },
  //     },
  // };

  const payload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: customOptions?.dbName || 'db-cluster-test-ui',
      namespace,
    },
    spec: {
      engine: {
        type: dbEngineType,
        version: customOptions?.dbVersion || lastVersion,
        replicas: +(customOptions?.numberOfNodes || 1),
        resources: {
          cpu: `${customOptions?.cpu || 1}`,
          memory: `${customOptions?.memory || 2}G`,
        },
        storage: {
          class: customOptions?.storageClass! || storageClassNames,
          size: `${customOptions?.disk || 25}Gi`,
        },
        // TODO return engineParams to tests
        // config: dbPayload.engineParametersEnabled
        //     ? dbPayload.engineParameters
        //     : '',
      },
      ...(customOptions?.backup && {
        backup: customOptions?.backup,
      }),
      // TODO return monitoring to tests
      monitoring: {
        // ...(!!dbPayload.monitoring && {
        //     monitoringConfigName:
        //         typeof dbPayload.monitoringInstance === 'string'
        //             ? dbPayload.monitoringInstance
        //             : dbPayload?.monitoringInstance!.name,
        // }),
      },
      proxy: {
        replicas: +(customOptions?.numberOfNodes || 1),
        expose: {
          type: customOptions?.externalAccess ? 'external' : 'internal',
          ...(!!customOptions?.externalAccess &&
            customOptions?.sourceRanges && {
              ipSourceRanges: customOptions?.sourceRanges.flatMap((source) =>
                source.sourceRange ? [source.sourceRange] : []
              ),
            }),
        },
      },
      // TODO return for backups tests
      // ...(backupDataSource?.dbClusterBackupName && {
      //     dataSource: {
      //         dbClusterBackupName: backupDataSource.dbClusterBackupName,
      //     },
      // }),
    },
  };

  console.log(payload);

  const response = await request.post(
    `/v1/namespaces/${namespace}/database-clusters`,
    {
      data: payload,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  expect(response.ok()).toBeTruthy();
};

export const deleteDbClusterFn = async (
  request: APIRequestContext,
  clusterName: string,
  desiredNamespace?: string
) => {
  const token = await getTokenFromLocalStorage();
  const namespaces = await getNamespacesFn(token, request);
  const namespace = desiredNamespace ?? namespaces[0];
  const deleteResponse = await request.delete(
    `/v1/namespaces/${namespace}/database-clusters/${clusterName}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  expect(deleteResponse.ok()).toBeTruthy();
};
