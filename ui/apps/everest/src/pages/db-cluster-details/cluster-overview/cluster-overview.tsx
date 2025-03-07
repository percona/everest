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

import { Stack } from '@mui/material';
import { dbEngineToDbType } from '@percona/utils';
import { useParams } from 'react-router-dom';
import { ProxyExposeType } from 'shared-types/dbCluster.types';
import { DbDetails, ResourcesDetails } from './cards';
import { useContext } from 'react';
import { DbClusterContext } from '../dbCluster.context';
import { BackupsDetails } from './cards/backups-details';
import { useDbClusterCredentials } from 'hooks/api/db-cluster/useCreateDbCluster';
import { useDbBackups } from 'hooks/api/backups/useBackups';
import { DbEngineType } from 'shared-types/dbEngines.types';
import { useRBACPermissions } from 'hooks/rbac';
import { isProxy } from 'utils/db';

export const ClusterOverview = () => {
  const { dbClusterName, namespace = '' } = useParams();
  const {
    dbCluster,
    isLoading: loadingCluster,
    canReadBackups,
    canUpdateDb,
  } = useContext(DbClusterContext);
  const { canRead } = useRBACPermissions(
    'database-cluster-credentials',
    `${namespace}/${dbClusterName}`
  );

  const { data: backups = [] } = useDbBackups(
    dbCluster?.metadata.name!,
    dbCluster?.metadata.namespace!,
    {
      refetchInterval: 10 * 1000,
    }
  );
  const schedules = dbCluster?.spec.backup?.schedules || [];

  const { data: dbClusterDetails, isFetching: fetchingClusterDetails } =
    useDbClusterCredentials(dbClusterName || '', namespace, {
      enabled: !!dbClusterName && canRead,
    });

  if (!dbCluster) {
    return null;
  }

  const hasBackupsOrSchedules = schedules.length > 0 || backups.length > 0;
  const dbType = dbCluster?.spec.engine.type;

  const pitrEnabled =
    dbType === DbEngineType.POSTGRESQL
      ? hasBackupsOrSchedules
      : dbCluster?.spec.backup?.pitr?.enabled!;

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={2}
      sx={{
        '& > *': {
          flexGrow: 1,
        },
      }}
    >
      {/* We force ! because while loading no info is shown */}
      <DbDetails
        loading={loadingCluster}
        type={dbEngineToDbType(dbCluster.spec.engine.type)}
        name={dbCluster.metadata.name!}
        namespace={dbCluster.metadata.namespace!}
        version={dbCluster.spec.engine.version!}
        loadingClusterDetails={fetchingClusterDetails}
        hostname={dbCluster.status?.hostname!}
        port={dbCluster.status?.port!}
        username={dbClusterDetails?.username!}
        password={dbClusterDetails?.password!}
        connectionUrl={dbClusterDetails?.connectionUrl!}
        externalAccess={
          isProxy(dbCluster.spec.proxy) &&
          dbCluster.spec.proxy.expose.type === ProxyExposeType.external
        }
        monitoring={dbCluster?.spec.monitoring.monitoringConfigName}
        parameters={!!dbCluster?.spec.engine.config}
      />
      <ResourcesDetails
        dbCluster={dbCluster}
        sharding={dbCluster?.spec.sharding}
        loading={loadingCluster}
        canUpdateDb={canUpdateDb}
      />
      {canReadBackups && (
        <BackupsDetails
          dbClusterName={dbCluster?.metadata.name}
          namespace={dbCluster?.metadata.namespace}
          schedules={dbCluster?.spec.backup?.schedules}
          pitrEnabled={pitrEnabled}
          pitrStorageName={dbCluster?.spec.backup?.pitr?.backupStorageName!}
          loading={loadingCluster}
          showStorage={dbType !== DbEngineType.POSTGRESQL}
        />
      )}
    </Stack>
  );
};
