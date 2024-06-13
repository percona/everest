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

import { Box, Skeleton, Typography } from '@mui/material';
import { CopyToClipboardButton } from '@percona/ui-lib';
import { HiddenPasswordToggle } from 'components/hidden-row';
import { useDbClusterCredentials } from 'hooks/api/db-cluster/useCreateDbCluster';
import { MRT_Row } from 'material-react-table';
import { ProxyExposeType } from 'shared-types/dbCluster.types';
import { Messages } from '../dbClusterView.messages';
import { DbClusterTableElement } from '../dbClusterView.types';
import { LabelValue } from './LabelValue';

export const ExpandedRow = ({
  row,
}: {
  row: MRT_Row<DbClusterTableElement>;
}) => {
  const {
    cpu,
    memory,
    storage,
    nodes,
    exposetype,
    namespace,
    databaseName,
    hostName = '',
    port,
    raw,
  } = row.original;
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ whiteSpace: 'nowrap' }} key={host}>
                {host}
              </Box>
              <CopyToClipboardButton
                buttonProps={{ sx: { mt: -1, mb: -1.5 } }}
                textToCopy={host}
              />
            </Box>
          ))}
        />
        <LabelValue label="Port" value={port} />
        {isPending || isFetching ? (
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
        )}
      </Box>
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 'bold', paddingBottom: 1 }}
        >
          {Messages.expandedRow.dbClusterParams}
        </Typography>
        <LabelValue label={Messages.expandedRow.cpu} value={cpu} />
        <LabelValue label={Messages.expandedRow.nodes} value={nodes} />
        <LabelValue label={Messages.expandedRow.memory} value={memory} />
        <LabelValue label={Messages.expandedRow.disk} value={storage} />
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
