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

import { Table } from '@percona/ui-lib';
import { useQueryClient } from '@tanstack/react-query';
import StatusField from 'components/status-field';
import { DATE_FORMAT } from 'consts';
import { format } from 'date-fns';
import {
  BACKUPS_QUERY_KEY,
  useDbBackups,
  useDeleteBackup,
} from 'hooks/api/backups/useBackups';
import { MRT_ColumnDef } from 'material-react-table';
import { RestoreDbModal } from 'modals/index.ts';
import { useContext, useMemo, useState } from 'react';
import { Backup, BackupStatus } from 'shared-types/backups.types';
import { DbClusterStatus } from 'shared-types/dbCluster.types.ts';
import { ScheduleModalContext } from '../backups.context.ts';
import { BACKUP_STATUS_TO_BASE_STATUS } from './backups-list.constants';
import { Messages } from './backups-list.messages';
import BackupListTableHeader from './table-header';
import { CustomConfirmDialog } from 'components/custom-confirm-dialog/custom-confirm-dialog.tsx';
import { DbEngineType } from '@percona/types';

import TableActionsMenu from 'components/table-actions-menu';
import { BackupActionButtons } from './backups-list-menu-actions';

export const BackupsList = () => {
  const queryClient = useQueryClient();
  const [openRestoreDbModal, setOpenRestoreDbModal] = useState(false);
  const [isNewClusterMode, setIsNewClusterMode] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState('');
  const {
    dbCluster,
    setMode: setScheduleModalMode,
    setOpenScheduleModal,
    setOpenOnDemandModal,
  } = useContext(ScheduleModalContext);

  const { mutate: deleteBackup, isPending: deletingBackup } = useDeleteBackup(
    dbCluster?.metadata.namespace
  );
  const { data: backups = [] } = useDbBackups(
    dbCluster.metadata.name,
    dbCluster.metadata.namespace,
    {
      refetchInterval: 10 * 1000,
    }
  );

  const columns = useMemo<MRT_ColumnDef<Backup>[]>(
    () => [
      {
        accessorKey: 'state',
        header: 'Status',
        filterVariant: 'multi-select',
        filterSelectOptions: Object.values(BackupStatus),
        Cell: ({ cell }) => (
          <StatusField
            status={cell.getValue<BackupStatus>()}
            statusMap={BACKUP_STATUS_TO_BASE_STATUS}
          >
            {/* @ts-ignore */}
            {cell.getValue()}
          </StatusField>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        accessorKey: 'backupStorageName',
        header: 'Storage',
      },
      {
        accessorKey: 'created',
        header: 'Started',
        enableColumnFilter: false,
        sortingFn: 'datetime',
        Cell: ({ cell }) =>
          cell.getValue<Date>()
            ? format(cell.getValue<Date>(), DATE_FORMAT)
            : '',
      },
      {
        accessorKey: 'completed',
        header: 'Finished',
        enableColumnFilter: false,
        sortingFn: 'datetime',
        Cell: ({ cell }) =>
          cell.getValue<Date>()
            ? format(cell.getValue<Date>(), DATE_FORMAT)
            : '',
      },
    ],
    []
  );

  if (!dbCluster) {
    return null;
  }

  const restoring = dbCluster.status?.status === DbClusterStatus.restoring;

  const handleDeleteBackup = (backupName: string) => {
    setSelectedBackup(backupName);
    setOpenDeleteDialog(true);
  };

  const handleManualBackup = () => {
    setOpenOnDemandModal(true);
  };

  const handleScheduledBackup = () => {
    setScheduleModalMode('new');
    setOpenScheduleModal(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleConfirmDelete = (
    backupName: string,
    cleanupBackupStorage: boolean
  ) => {
    deleteBackup(
      { backupName: backupName, cleanupBackupStorage: cleanupBackupStorage },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: [
              BACKUPS_QUERY_KEY,
              dbCluster.metadata.namespace,
              dbCluster.metadata.name,
            ],
          });
          handleCloseDeleteDialog();
        },
      }
    );
  };

  const handleRestoreBackup = (backupName: string) => {
    setSelectedBackup(backupName);
    setIsNewClusterMode(false);
    setOpenRestoreDbModal(true);
  };

  const handleRestoreToNewDbBackup = (backupName: string) => {
    setSelectedBackup(backupName);
    setOpenRestoreDbModal(true);
    setIsNewClusterMode(true);
  };

  return (
    <>
      <Table
        tableName="backupList"
        noDataMessage={Messages.noData}
        data={backups}
        columns={columns}
        initialState={{
          sorting: [
            {
              id: 'created',
              desc: true,
            },
          ],
        }}
        renderTopToolbarCustomActions={() => (
          <BackupListTableHeader
            onNowClick={handleManualBackup}
            onScheduleClick={handleScheduledBackup}
          />
        )}
        enableRowActions
        renderRowActions={({ row }) => {
          const menuItems = BackupActionButtons(
            row,
            restoring,
            handleDeleteBackup,
            handleRestoreBackup,
            handleRestoreToNewDbBackup,
            dbCluster
          );
          return <TableActionsMenu menuItems={menuItems} />;
        }}
      />
      {openDeleteDialog && (
        <CustomConfirmDialog
          isOpen={openDeleteDialog}
          selectedId={selectedBackup}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteDialog.header}
          handleConfirm={() =>
            handleConfirmDelete(
              selectedBackup,
              dbCluster.spec.engine.type !== DbEngineType.POSTGRESQL
            )
          }
          submitting={deletingBackup}
          confirmationInput={false}
          dialogContent={Messages.deleteDialog.content(
            selectedBackup,
            dbCluster.spec.engine.type
          )}
          alertMessage={Messages.deleteDialog.alertMessage}
          submitMessage={Messages.deleteDialog.confirmButton}
        />
      )}
      {openRestoreDbModal && dbCluster && (
        <RestoreDbModal
          dbCluster={dbCluster}
          namespace={dbCluster.metadata.namespace}
          isNewClusterMode={isNewClusterMode}
          isOpen={openRestoreDbModal}
          closeModal={() => setOpenRestoreDbModal(false)}
          backupName={selectedBackup}
        />
      )}
    </>
  );
};
