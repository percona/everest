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

import { Box, Divider, Skeleton, Typography } from '@mui/material';
import { CopyToClipboardButton } from '@percona/ui-lib';
import { HiddenPasswordToggle } from 'components/hidden-row';
import { useDbClusterCredentials } from 'hooks/api/db-cluster/useCreateDbCluster';
import { MRT_Row } from 'material-react-table';
import { ProxyExposeType } from 'shared-types/dbCluster.types';
import { Messages } from '../dbClusterView.messages';
import { DbClusterTableElement } from '../dbClusterView.types';
import { LabelValue } from './LabelValue';
import { useRBACPermissions } from 'hooks/rbac';
import {
  cpuParser,
  getResourcesDetailedString,
  memoryParser,
} from 'utils/k8ResourceParser';
import { getProxyUnitNamesFromDbType } from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';
import { DbEngineType } from '@percona/types';

export const ExpandedRow = ({
  row,
}: {
  row: MRT_Row<DbClusterTableElement>;
}) => {
  const {
    dbType,
    cpu,
    memory,
    storage,
    nodes,
    proxies,
    proxyCpu,
    proxyMemory,
    exposetype,
    namespace,
    databaseName,
    hostName = '',
    port,
    raw,
  } = row.original;
  const sharding = raw.spec.sharding;
  const parsedDiskValues = memoryParser(storage.toString());
  const parsedMemoryValues = memoryParser(memory.toString(), 'G');
  const parsedProxyMemoryValues = memoryParser(proxyMemory.toString(), 'G');
  const cpuResourcesStr = getResourcesDetailedString(
    cpuParser(cpu.toString() || '0'),
    ''
  );
  const cpuProxyResourcesStr = getResourcesDetailedString(
    cpuParser(proxyCpu.toString() || '0'),
    ''
  );
  const memoryResourcesStr = getResourcesDetailedString(
    parsedMemoryValues.value,
    'GB'
  );
  const memoryProxyResourcesStr = getResourcesDetailedString(
    parsedProxyMemoryValues.value,
    'GB'
  );
  const storageResourcesStr = getResourcesDetailedString(
    parsedDiskValues.value,
    parsedDiskValues.originalUnit
  );
  const isExpanded = row.getIsExpanded();
  const { isPending, isFetching, data } = useDbClusterCredentials(
    databaseName,
    namespace,
    {
      enabled: !!isExpanded,
      staleTime: 10 * (60 * 1000),
      gcTime: 15 * (60 * 1000),
    }
  );

  const { canRead: canReadCredentials } = useRBACPermissions(
    'database-cluster-credentials',
    `${namespace}/${databaseName}`
  );

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'start',
        alignItems: 'start',
        gap: '50px',
        cursor: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 'bold', paddingBottom: 1 }}
        >
          {Messages.expandedRow.connection}
        </Typography>
        <LabelValue
          label="Host"
          value={hostName.split(',').map((host) => (
            <Box sx={{ display: 'flex', gap: 1 }} key={host}>
              <Box sx={{ whiteSpace: 'nowrap' }}>{host}</Box>
              <CopyToClipboardButton
                buttonProps={{
                  sx: { mt: -0.5 },
                  color: 'primary',
                  size: 'small',
                }}
                textToCopy={host}
              />
            </Box>
          ))}
        />
        <LabelValue label="Port" value={port} />
        {canReadCredentials &&
          (isPending || isFetching ? (
            <>
              <Skeleton width="300px" />
              <Skeleton width="300px" />
            </>
          ) : (
            <>
              <LabelValue label="Username" value={data?.username} />
              <LabelValue
                label="Password"
                value={
                  <HiddenPasswordToggle showCopy value={data?.password || ''} />
                }
              />
            </>
          ))}
      </Box>
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 'bold', paddingBottom: 1 }}
        >
          {Messages.expandedRow.dbClusterParams}
        </Typography>
        <Box>
          {dbType === DbEngineType.PSMDB && (
            <Box>
              <Typography sx={{ fontWeight: 'bold', paddingBottom: 1 }}>
                {Messages.expandedRow.sharding}
              </Typography>
              <LabelValue
                label={Messages.expandedRow.shardingStatus}
                value={
                  sharding?.enabled
                    ? Messages.expandedRow.enabled
                    : Messages.expandedRow.disabled
                }
              />
              <LabelValue
                label={Messages.expandedRow.nrOfShards}
                value={sharding?.shards}
              />
              <LabelValue
                label={Messages.expandedRow.configServers}
                value={sharding?.configServer.replicas}
              />
            </Box>
          )}
        </Box>
        <Divider sx={{ margin: '10px 0' }} />
        <Typography sx={{ fontWeight: 'bold', paddingBottom: 1 }}>
          {`${nodes} node${+nodes > 1 ? 's' : ''} ${dbType === DbEngineType.PSMDB ? 'per shard' : ''}`}
        </Typography>
        <LabelValue label={Messages.expandedRow.cpu} value={cpuResourcesStr} />
        <LabelValue
          label={Messages.expandedRow.memory}
          value={memoryResourcesStr}
        />
        <LabelValue
          label={Messages.expandedRow.disk}
          value={storageResourcesStr}
        />
        <Divider sx={{ margin: '10px 0' }} />
        {proxies > 0 && (
          <>
            <Typography sx={{ fontWeight: 'bold', paddingBottom: 1 }}>
              {`${proxies} ${getProxyUnitNamesFromDbType(dbEngineToDbType(dbType))[proxies > 1 ? 'plural' : 'singular']} ${dbType === DbEngineType.PSMDB ? 'per shard' : ''}`}
            </Typography>
            <LabelValue
              label={Messages.expandedRow.cpu}
              value={cpuProxyResourcesStr}
            />
            <LabelValue
              label={Messages.expandedRow.memory}
              value={memoryProxyResourcesStr}
            />
            <Divider sx={{ margin: '10px 0' }} />
          </>
        )}
        <LabelValue
          label={Messages.expandedRow.externalAccess}
          value={
            exposetype === ProxyExposeType.external
              ? Messages.expandedRow.enabled
              : Messages.expandedRow.disabled
          }
        />
        <LabelValue
          label={Messages.expandedRow.monitoring}
          value={
            raw.spec.monitoring.monitoringConfigName
              ? Messages.expandedRow.enabled
              : Messages.expandedRow.disabled
          }
        />
      </Box>
    </Box>
  );
};
