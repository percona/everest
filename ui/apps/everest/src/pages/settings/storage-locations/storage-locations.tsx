import { Add } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import {
  BACKUP_STORAGES_QUERY_KEY,
  useBackupStorages,
  useCreateBackupStorage,
  useDeleteBackupStorage,
  useEditBackupStorage,
} from 'hooks/api/backup-storages/useBackupStorages';
import { type MRT_ColumnDef } from 'material-react-table';
import { useMemo, useState } from 'react';
import { BackupStorage, StorageType } from 'shared-types/backupStorages.types';
import {
  updateDataAfterCreate,
  updateDataAfterDelete,
  updateDataAfterEdit,
} from 'utils/generalOptimisticDataUpdate';
import { CreateEditModalStorage } from './createEditModal/create-edit-modal';
import { Messages } from './storage-locations.messages';
import {
  StorageLocationsFields,
  BackupStorageTableElement,
} from './storage-locations.types';
import {
  convertBackupStoragesPayloadToTableFormat,
  convertStoragesType,
} from './storage-locations.utils';
import { useNamespacePermissionsForResource } from 'hooks/rbac';
import TableActionsMenu from '../../../components/table-actions-menu';
import { StorageLocationsActionButtons } from './storage-locations-menu-actions';

export const StorageLocations = () => {
  const queryClient = useQueryClient();
  const { canCreate } = useNamespacePermissionsForResource('backup-storages');
  const { results: backupStoragesResults, isLoading: backupStoragesLoading } = useBackupStorages();

  const tableData = useMemo(
    () => {
      const queryResults = backupStoragesResults.map(({ queryResult }) => queryResult);
      const clusterMap = backupStoragesResults.reduce((acc, { cluster }, index) => {
        acc[index] = cluster;
        return acc;
      }, {} as { [index: number]: string });
      return convertBackupStoragesPayloadToTableFormat(queryResults, clusterMap);
    },
    [backupStoragesResults]
  );

  const { mutate: createBackupStorage, isPending: creatingBackupStorage } =
    useCreateBackupStorage();
  const { mutate: editBackupStorage, isPending: editingBackupStorage } =
    useEditBackupStorage();
  const { mutate: deleteBackupStorage, isPending: deletingBackupStorage } =
    useDeleteBackupStorage();

  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const [selectedStorageName, setSelectedStorageName] = useState<string>('');
  const [selectedStorageNamespace, setSelectedStorageNamespace] =
    useState<string>('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedStorageLocation, setSelectedStorageLocation] =
    useState<BackupStorage>();

  const handleSubmit = (isEdit: boolean, data: BackupStorage) => {
    if (isEdit) {
      editBackupStorage({ ...data, cluster: 'in-cluster' }, {
        onSuccess: (editedLocation) => {
          updateDataAfterEdit(queryClient, [
            BACKUP_STORAGES_QUERY_KEY,
            'in-cluster',
            data.namespace,
          ])(editedLocation as BackupStorage);
          handleCloseModal();
        },
      });
    } else {
      createBackupStorage({ ...data, cluster: 'in-cluster' }, {
        onSuccess: (newLocation) => {
          updateDataAfterCreate(queryClient, [
            BACKUP_STORAGES_QUERY_KEY,
            'in-cluster',
            data.namespace,
          ])(newLocation as BackupStorage);
          handleCloseModal();
        },
      });
    }
  };

  const handleDelete = (backupStorageId: string, namespace: string) => {
    deleteBackupStorage(
      { backupStorageId, namespace, cluster: 'in-cluster' },
      {
        onSuccess: () => {
          updateDataAfterDelete(queryClient, [
            BACKUP_STORAGES_QUERY_KEY,
            'in-cluster',
            namespace,
          ], backupStorageId);
          handleCloseDeleteDialog();
        },
      }
    );
  };

  const handleCloseModal = () => {
    setOpenCreateEditModal(false);
    setSelectedStorageLocation(undefined);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedStorageName('');
    setSelectedStorageNamespace('');
  };

  const handleEdit = (storage: BackupStorage) => {
    setSelectedStorageLocation(storage);
    setOpenCreateEditModal(true);
  };

  const handleDeleteClick = (name: string, namespace: string) => {
    setSelectedStorageName(name);
    setSelectedStorageNamespace(namespace);
    setOpenDeleteDialog(true);
  };

  const columns = useMemo<MRT_ColumnDef<BackupStorageTableElement>[]>(
    () => [
      {
        accessorKey: StorageLocationsFields.name,
        header: Messages.columns.name,
      },
      {
        accessorKey: StorageLocationsFields.type,
        header: Messages.columns.type,
        Cell: ({ cell }) => convertStoragesType(cell.getValue<StorageType>()),
      },
      {
        accessorKey: StorageLocationsFields.cluster,
        header: Messages.columns.cluster,
      },
      {
        accessorKey: StorageLocationsFields.namespace,
        header: Messages.columns.namespace,
      },
    ],
    []
  );

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 2,
        }}
      >
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCreateEditModal(true)}
          disabled={canCreate.length <= 0}
        >
          {Messages.addStorageLocationButton}
        </Button>
      </Box>
      <Table
        getRowId={(row) => row.name}
        state={{ isLoading: backupStoragesLoading }}
        tableName="storageLocations"
        columns={columns}
        data={tableData}
        enableRowActions
        renderRowActions={({ row }) => {
          const menuItems = StorageLocationsActionButtons(
            row,
            handleEdit,
            handleDeleteClick
          );
          return <TableActionsMenu menuItems={menuItems} />;
        }}
      />
      {openCreateEditModal && (
        <CreateEditModalStorage
          open={openCreateEditModal}
          handleCloseModal={handleCloseModal}
          handleSubmitModal={handleSubmit}
          selectedStorageLocation={selectedStorageLocation}
          isLoading={creatingBackupStorage || editingBackupStorage}
        />
      )}
      {openDeleteDialog && (
        <ConfirmDialog
          open={openDeleteDialog}
          selectedId={selectedStorageName}
          cancelMessage="Cancel"
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteDialog.header}
          handleConfirm={() =>
            handleDelete(selectedStorageName, selectedStorageNamespace)
          }
          disabledButtons={deletingBackupStorage}
        >
          {Messages.deleteDialog.content(selectedStorageName)}
        </ConfirmDialog>
      )}
    </>
  );
};
