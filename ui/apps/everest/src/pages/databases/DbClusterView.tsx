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

import { Box, Stack } from '@mui/material';
import { Table } from '@percona/ui-lib';
import StatusField from 'components/status-field';
import {
  useDBEnginesForNamespaces,
  useNamespaces,
} from 'hooks/api/namespaces/useNamespaces';
import { type MRT_ColumnDef } from 'material-react-table';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DbClusterStatus } from 'shared-types/dbCluster.types';
import { DbEngineType } from 'shared-types/dbEngines.types';
import { useDbClusters } from 'hooks/api/db-clusters/useDbClusters';
import { DB_CLUSTER_STATUS_TO_BASE_STATUS } from './DbClusterView.constants';
import {
  beautifyDbClusterStatus,
  convertDbClusterPayloadToTableFormat,
} from './DbClusterView.utils';
import { DbClusterTableElement } from './dbClusterView.types';
import { ExpandedRow } from './expandedRow/ExpandedRow';
import { LastBackup } from './lastBackup/LastBackup';
import { beautifyDbTypeName, dbEngineToDbType } from '@percona/utils';
import { useNamespacePermissionsForResource } from 'hooks/rbac';
import { DbActions } from 'components/db-actions/db-actions';
import CreateDbButton from '../../components/create-db-button/create-db-button';
import { PendingIcon } from '@percona/ui-lib';
import EmptyStateDatabases from 'components/empty-state-databases';
import EmptyStateNamespaces from 'components/empty-state-namespaces';

export const DbClusterView = () => {
  const { data: namespaces = [], isLoading: loadingNamespaces } = useNamespaces(
    {
      refetchInterval: 10 * 1000,
    }
  );

  const navigate = useNavigate();
  // TODO: Pass the correct cluster name here. For now, use a placeholder or get from context.
  const CLUSTER_PLACEHOLDER = 'in-cluster'; // Replace with actual cluster selection logic
  const { results: dbEngines } = useDBEnginesForNamespaces(CLUSTER_PLACEHOLDER);
  const hasAvailableDbEngines = dbEngines.some(
    (obj) => (obj?.data || []).length > 0
  );

  const { canCreate } = useNamespacePermissionsForResource('database-clusters');

  const canAddCluster = canCreate.length > 0 && hasAvailableDbEngines;
  const { results: dbClustersResults, isLoading: dbClustersLoading } = useDbClusters();

  const tableData = useMemo(
    () => convertDbClusterPayloadToTableFormat(dbClustersResults),
    [dbClustersResults]
  );

  const columns = useMemo<MRT_ColumnDef<DbClusterTableElement>[]>(
    () => [
      {
        accessorKey: 'status',
        header: 'Status',
        filterVariant: 'multi-select',
        filterSelectOptions: Object.values(DbClusterStatus).map((status) => ({
          text: beautifyDbClusterStatus(status),
          value: status,
        })),
        maxSize: 120,
        Cell: ({ cell }) => (
          <StatusField
            dataTestId={cell?.row?.original?.databaseName}
            status={cell.getValue<DbClusterStatus>()}
            statusMap={DB_CLUSTER_STATUS_TO_BASE_STATUS}
            defaultIcon={PendingIcon}
          >
            {beautifyDbClusterStatus(cell.getValue<DbClusterStatus>())}
          </StatusField>
        ),
      },
      {
        accessorKey: 'databaseName',
        header: 'Database name',
      },
      {
        accessorFn: ({ dbType }) => dbType,
        filterVariant: 'multi-select',
        filterSelectOptions: Object.values(DbEngineType),
        header: 'Technology',
        id: 'technology',
        Cell: ({ row }) => (
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            gap={1}
          >
            {beautifyDbTypeName(dbEngineToDbType(row.original?.dbType))}{' '}
            {row.original?.dbVersion}
          </Stack>
        ),
      },
      {
        id: 'lastBackup',
        header: 'Last backup',
        Cell: ({ row }) => (
          <LastBackup
            dbName={row.original?.databaseName}
            namespace={row.original?.namespace}
          />
        ),
      },
      {
        accessorKey: 'nodes',
        id: 'nodes',
        header: 'Nº nodes',
      },
      {
        accessorKey: 'cluster',
        id: 'cluster',
        header: 'Cluster',
      },
      {
        accessorKey: 'namespace',
        id: 'namespace',
        header: 'Namespace',
      },
      {
        accessorKey: 'monitoringConfigName',
        header: 'Monitoring instance name',
        minSize: 250,
      },
      // {
      //   accessorKey: 'backupsEnabled',
      //   header: 'Backups',
      //   filterVariant: 'checkbox',
      //   accessorFn: (row) => (row.backupsEnabled ? 'true' : 'false'),
      //   Cell: ({ cell }) =>
      //     cell.getValue() === 'true' ? 'Enabled' : 'Disabled',
      // },
      // {
      //   accessorKey: 'kubernetesCluster',
      //   header: 'Kubernetes Cluster',
      // },
    ],
    []
  );
  return (
    <Stack direction="column" alignItems="center">
      <Box sx={{ width: '100%' }}>
        <Table
          getRowId={(row) => row.databaseName}
          tableName="dbClusterView"
          emptyState={
            namespaces.length > 0 ? (
              <EmptyStateDatabases
                showCreationButton={canAddCluster}
                hasCreatePermission={canAddCluster}
              />
            ) : (
              <EmptyStateNamespaces />
            )
          }
          state={{ isLoading: dbClustersLoading || loadingNamespaces }}
          columns={columns}
          data={tableData}
          enableRowActions
          renderRowActions={({ row }) => {
            return <DbActions dbCluster={row.original.raw} cluster={row.original.cluster} />;
          }}
          renderDetailPanel={({ row }) => <ExpandedRow row={row} />}
          enableRowHoverAction
          rowHoverAction={(row) =>
            navigate(
              `/databases/${row.original.namespace}/${row.original.databaseName}/overview`,
              { state: { cluster: row.original.cluster } }
            )
          }
          renderTopToolbarCustomActions={() =>
            canAddCluster && tableData.length > 0 && <CreateDbButton />
          }
          hideExpandAllIcon
        />
      </Box>
    </Stack>
  );
};
