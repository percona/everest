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

import AddIcon from '@mui/icons-material/Add';
import { Box, Button, MenuItem, Stack } from '@mui/material';
import { Table } from '@percona/ui-lib';
import StatusField from 'components/status-field';
import { useDbActions } from 'hooks/api/db-cluster/useDbActions';
import { useNamespaces } from 'hooks/api/namespaces/useNamespaces';
import { useDeleteDbCluster } from 'hooks/api/db-cluster/useDeleteDbCluster';
import { type MRT_ColumnDef, MRT_Row } from 'material-react-table';
import { RestoreDbModal } from 'modals';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DbClusterStatus } from 'shared-types/dbCluster.types';
import { DbEngineType } from 'shared-types/dbEngines.types';
import { useDBClustersForNamespaces } from 'hooks/api/db-clusters/useDbClusters';
import { DB_CLUSTER_STATUS_TO_BASE_STATUS } from './DbClusterView.constants';
import {
  beautifyDbClusterStatus,
  convertDbClusterPayloadToTableFormat,
} from './DbClusterView.utils';
import { Messages } from './dbClusterView.messages';
import { DbClusterTableElement } from './dbClusterView.types';
import { ExpandedRow } from './expandedRow/ExpandedRow';
import { CustomConfirmDialog } from 'components/custom-confirm-dialog';
import { LastBackup } from './lastBackup/LastBackup';
import { useDbBackups } from 'hooks/api/backups/useBackups';
import { beautifyDbTypeName, dbEngineToDbType } from '@percona/utils';
import { useGetPermissions } from 'utils/useGetPermissions';
import TableActionsMenu from 'components/table-actions-menu';
import {
  BorderColor,
  DeleteOutline,
  PauseCircleOutline,
} from '@mui/icons-material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { DbCluster } from 'shared-types/dbCluster.types';

const DbActionButtons = (
  row: MRT_Row<DbClusterTableElement>,
  setIsNewClusterMode: React.Dispatch<React.SetStateAction<boolean>>,
  handleDbRestart: (dbCluster: DbCluster) => void,
  handleDbSuspendOrResumed: (dbCluster: DbCluster) => void,
  handleDeleteDbCluster: (dbCluster: DbCluster) => void,
  isPaused: (dbCluster: DbCluster) => boolean | undefined,
  handleRestoreDbCluster: (dbCluster: DbCluster) => void,
  canCreate: boolean,
  canUpdate: boolean,
  canDelete: boolean,
) => {
  return [
    ...(canUpdate
      ? [
          <MenuItem
            disabled={row.original.status === DbClusterStatus.restoring}
            key={0}
            component={Link}
            to="/databases/edit"
            state={{
              selectedDbCluster: row.original.databaseName!,
              namespace: row.original.namespace,
            }}
            sx={{
              m: 0,
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <BorderColor fontSize="small" /> {Messages.menuItems.edit}
          </MenuItem>,
          <MenuItem
            disabled={row.original.status === DbClusterStatus.restoring}
            key={2}
            onClick={() => {
              handleDbRestart(row.original.raw);
            }}
            sx={{
              m: 0,
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <RestartAltIcon /> {Messages.menuItems.restart}
          </MenuItem>,
        ]
      : []),
    ...(canCreate
      ? [
          <MenuItem
            disabled={row.original.status === DbClusterStatus.restoring}
            key={5}
            onClick={() => {
              handleRestoreDbCluster(row.original.raw);
              setIsNewClusterMode(true);
            }}
            sx={{
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <AddIcon /> {Messages.menuItems.createNewDbFromBackup}
          </MenuItem>,
        ]
      : []),
    ...(canUpdate
      ? [
          <MenuItem
            disabled={
              row.original.status === DbClusterStatus.restoring || !canUpdate
            }
            key={3}
            data-testid={`${row.original?.databaseName}-restore`}
            onClick={() => {
              handleRestoreDbCluster(row.original.raw);
              setIsNewClusterMode(false);
            }}
            sx={{
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <KeyboardReturnIcon /> {Messages.menuItems.restoreFromBackup}
          </MenuItem>,
          <MenuItem
            key={4}
            disabled={
              row.original.status === DbClusterStatus.pausing ||
              row.original.status === DbClusterStatus.restoring
            }
            onClick={() => {
              handleDbSuspendOrResumed(row.original.raw);
            }}
            sx={{
              m: 0,
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <PauseCircleOutline />{' '}
            {isPaused(row.original.raw)
              ? Messages.menuItems.resume
              : Messages.menuItems.suspend}
          </MenuItem>,
        ]
      : []),
    ...(canDelete
      ? [
          <MenuItem
            data-testid={`${row.original?.databaseName}-delete`}
            key={1}
            onClick={() => {
              handleDeleteDbCluster(row.original.raw);
            }}
            sx={{
              m: 0,
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <DeleteOutline /> {Messages.menuItems.delete}
          </MenuItem>,
        ]
      : []),
  ];
};

export const DbClusterView = () => {
  const [isNewClusterMode, setIsNewClusterMode] = useState(false);
  const { data: namespaces = [], isLoading: loadingNamespaces } =
    useNamespaces();
  const dbClustersResults = useDBClustersForNamespaces(namespaces);
  const dbClustersLoading = dbClustersResults.some(
    (result) => result.queryResult.isLoading
  );

  const tableData = useMemo(
    () => convertDbClusterPayloadToTableFormat(dbClustersResults),
    [dbClustersResults]
  );

  const { isPending: deletingCluster } = useDeleteDbCluster();
  const {
    openDeleteDialog,
    openRestoreDialog,
    handleConfirmDelete,
    handleCloseDeleteDialog,
    handleCloseRestoreDialog,
    handleRestoreDbCluster,
    handleDbRestart,
    handleDbSuspendOrResumed,
    handleDeleteDbCluster,
    isPaused,
    selectedDbCluster,
  } = useDbActions();
  const navigate = useNavigate();

  const { canCreate } = useGetPermissions({ resource: 'database-clusters' });
  const { data: backups = [] } = useDbBackups(
    selectedDbCluster?.metadata.name!,
    selectedDbCluster?.metadata.namespace!,
    {
      enabled: !!selectedDbCluster?.metadata.name,
      refetchInterval: 10 * 1000,
    }
  );
  const disableKeepDataCheckbox =
    selectedDbCluster?.spec.engine.type === DbEngineType.POSTGRESQL;
  const hideCheckbox = !backups.length;

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
          tableName="dbClusterView"
          noDataMessage={Messages.dbCluster.noData}
          state={{ isLoading: dbClustersLoading || loadingNamespaces }}
          columns={columns}
          data={tableData}
          enableRowActions
          renderRowActions={({ row }) => {
            const {canUpdate, canDelete, canCreate } = useGetPermissions({
              resource: 'database-clusters',
              specificResource: row.original.databaseName,
              namespace: row.original.namespace,
            });

            const menuItems = DbActionButtons(
              row,
              setIsNewClusterMode,
              handleDbRestart,
              handleDbSuspendOrResumed,
              handleDeleteDbCluster,
              isPaused,
              handleRestoreDbCluster,
              canCreate,
              canUpdate,
              canDelete
            );
            return <TableActionsMenu menuItems={menuItems} />;
          }}
          renderDetailPanel={({ row }) => <ExpandedRow row={row} />}
          muiTableBodyRowProps={({ row, isDetailPanel }) => ({
            onClick: () => {
              if (!isDetailPanel) {
                navigate(
                  `/databases/${row.original.namespace}/${row.original.databaseName}/overview`
                );
              }
            },
            sx: {
              ...(!isDetailPanel && {
                cursor: 'pointer', // you might want to change the cursor too when adding an onClick
              }),
            },
          })}
          renderTopToolbarCustomActions={() => (
            <Button
              size="small"
              startIcon={<AddIcon />}
              component={Link}
              to="/databases/new"
              variant="contained"
              data-testid="add-db-cluster-button"
              sx={{ display: canCreate ? 'flex' : 'none' }}
            >
              {Messages.createDatabase}
            </Button>
          )}
          hideExpandAllIcon
        />
      </Box>
      {openRestoreDialog && (
        <RestoreDbModal
          dbCluster={selectedDbCluster!}
          namespace={selectedDbCluster?.metadata.namespace || ''}
          isOpen
          closeModal={handleCloseRestoreDialog}
          isNewClusterMode={isNewClusterMode}
        />
      )}
      {openDeleteDialog && (
        <CustomConfirmDialog
          inputLabel={Messages.deleteModal.databaseName}
          inputPlaceholder={Messages.deleteModal.databaseName}
          isOpen={openDeleteDialog}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteModal.header}
          submitting={deletingCluster}
          selectedId={selectedDbCluster?.metadata.name || ''}
          handleConfirm={({ dataCheckbox: keepBackupStorageData }) =>
            handleConfirmDelete(keepBackupStorageData)
          }
          alertMessage={Messages.deleteModal.alertMessage}
          dialogContent={Messages.deleteModal.content(
            selectedDbCluster!.metadata.name
          )}
          submitMessage={Messages.deleteModal.confirmButtom}
          checkboxMessage={Messages.deleteModal.checkboxMessage}
          disableCheckbox={disableKeepDataCheckbox}
          tooltipText={Messages.deleteModal.disabledCheckboxForPGTooltip}
          hideCheckbox={hideCheckbox}
        />
      )}
    </Stack>
  );
};
