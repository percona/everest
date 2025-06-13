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
  getTotalResourcesDetailedString,
  memoryParser,
} from 'utils/k8ResourceParser';
import { getProxyUnitNamesFromDbType } from 'utils/db';
import { dbEngineToDbType } from '@percona/utils';

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
    cluster,
  } = row.original;

  const parsedDiskValues = memoryParser(storage.toString());
  const parsedMemoryValues = memoryParser(memory.toString());
  const parsedProxyMemoryValues = memoryParser(proxyMemory.toString());
  const cpuResourcesStr = getTotalResourcesDetailedString(
    cpuParser(cpu.toString() || '0'),
    nodes,
    'CPU'
  );
  const cpuProxyResourcesStr = getTotalResourcesDetailedString(
    cpuParser(proxyCpu.toString() || '0'),
    proxies,
    'CPU'
  );
  const memoryResourcesStr = getTotalResourcesDetailedString(
    parsedMemoryValues.value,
    nodes,
    parsedMemoryValues.originalUnit
  );
  const memoryProxyResourcesStr = getTotalResourcesDetailedString(
    parsedProxyMemoryValues.value,
    proxies,
    parsedProxyMemoryValues.originalUnit
  );
  const storageResourcesStr = getTotalResourcesDetailedString(
    parsedDiskValues.value,
    nodes,
    parsedDiskValues.originalUnit
  );
  const isExpanded = row.getIsExpanded();
  const { isPending, isFetching, data } = useDbClusterCredentials(
    databaseName,
    namespace,
    cluster,
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
        <LabelValue label={Messages.expandedRow.nodes} value={nodes} />
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
            <LabelValue
              label={`Nº ${getProxyUnitNamesFromDbType(dbEngineToDbType(dbType)).plural}`}
              value={proxies}
            />
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
