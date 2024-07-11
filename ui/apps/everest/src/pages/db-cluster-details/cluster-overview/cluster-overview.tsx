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
import { useDbClusterCredentials } from 'hooks/api/db-cluster/useCreateDbCluster';
import { useParams } from 'react-router-dom';
import { ProxyExposeType } from 'shared-types/dbCluster.types';
import { ConnectionDetails, DatabaseDetails, ResourcesDetails } from './cards';
import { useContext } from 'react';
import { DbClusterContext } from '../dbCluster.context';

export const ClusterOverview = () => {
  const { dbClusterName, namespace = '' } = useParams();
  const { dbCluster, isLoading: loadingCluster } = useContext(DbClusterContext);
  const { data: dbClusterDetails, isFetching: fetchingClusterDetails } =
    useDbClusterCredentials(dbClusterName || '', namespace, {
      enabled: !!dbClusterName,
    });

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
      <DatabaseDetails
        loading={loadingCluster}
        type={dbEngineToDbType(dbCluster?.spec.engine.type!)}
        name={dbCluster?.metadata.name!}
        namespace={dbCluster?.metadata.namespace!}
        version={dbCluster?.spec.engine.version!}
        numberOfNodes={dbCluster?.spec.engine.replicas!}
        cpu={dbCluster?.spec.engine.resources?.cpu!}
        memory={dbCluster?.spec.engine.resources?.memory!}
        disk={dbCluster?.spec.engine.storage.size!}
        backup={dbCluster?.spec?.backup}
        externalAccess={
          dbCluster?.spec.proxy.expose.type === ProxyExposeType.external
        }
        monitoring={dbCluster?.spec.monitoring.monitoringConfigName}
      />
      <ConnectionDetails
        loading={loadingCluster}
        loadingClusterDetails={fetchingClusterDetails}
        hostname={dbCluster?.status?.hostname!}
        port={dbCluster?.status?.port!}
        username={dbClusterDetails?.username!}
        password={dbClusterDetails?.password!}
      />
      <ResourcesDetails
        numberOfNodes={dbCluster?.spec.engine.replicas!}
        cpu={dbCluster?.spec.engine.resources?.cpu!}
        memory={dbCluster?.spec.engine.resources?.memory!}
        disk={dbCluster?.spec.engine.storage.size!}
        loading={loadingCluster}
      />
    </Stack>
  );
};
