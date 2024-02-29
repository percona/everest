import { Add, Delete, Edit } from '@mui/icons-material';
import { Box, Button, MenuItem } from '@mui/material';
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
import { LabelValue } from 'pages/databases/expandedRow/LabelValue';
import { useMemo, useState } from 'react';
import { BackupStorage, StorageType } from 'shared-types/backupStorages.types';
import {
  updateDataAfterCreate,
  updateDataAfterDelete,
  updateDataAfterEdit,
} from 'utils/generalOptimisticDataUpdate';
import { CreateEditModalStorage } from './createEditModal/create-edit-modal';
import { Messages } from './storage-locations.messages';
import { StorageLocationsFields } from './storage-locations.types';
import { convertStoragesType } from './storage-locations.utils';
export const StorageLocations = () => {
  const queryClient = useQueryClient();

  const { data: backupStorages = [], isFetching } = useBackupStorages();
  const { mutate: createBackupStorage, isPending: creatingBackupStorage } =
    useCreateBackupStorage();
  const { mutate: editBackupStorage, isPending: editingBackupStorage } =
    useEditBackupStorage();
  const { mutate: deleteBackupStorage, isPending: deletingBackupStorage } =
    useDeleteBackupStorage();

  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const [selectedStorageName, setSelectedStorageName] = useState<string>('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedStorageLocation, setSelectedStorageLocation] =
    useState<BackupStorage>();

  const columns = useMemo<MRT_ColumnDef<BackupStorage>[]>(
    () => [
      {
        accessorKey: StorageLocationsFields.name,
        header: Messages.name,
      },
      {
        accessorKey: StorageLocationsFields.type,
        header: Messages.type,
        Cell: ({ cell }) => convertStoragesType(cell.getValue<StorageType>()),
      },
      {
        accessorKey: StorageLocationsFields.bucketName,
        header: Messages.bucketName,
      },
      {
        accessorKey: StorageLocationsFields.namespaces,
        header: Messages.namespaces,
        Cell: ({ cell }) => {
          const val = cell.getValue<string[]>();
          if (val) {
            return val.join(', ');
          } else {
            return '-';
          }
        },
      },
      {
        accessorKey: StorageLocationsFields.description,
        header: Messages.description,
        enableHiding: false,
      },
      {
        accessorKey: StorageLocationsFields.url,
        header: Messages.url,
        enableHiding: false,
      },
    ],
    []
  );
  const handleOpenCreateModal = () => {
    setSelectedStorageLocation(undefined);
    setOpenCreateEditModal(true);
  };

  const handleOpenEditModal = (storageLocation: BackupStorage) => {
    setSelectedStorageLocation(storageLocation);
    setOpenCreateEditModal(true);
  };

  const handleCloseModal = () => {
    setSelectedStorageLocation(undefined);
    setOpenCreateEditModal(false);
  };

  const handleEditBackup = (data: BackupStorage) => {
    editBackupStorage(data, {
      onSuccess: (updatedLocation) => {
        updateDataAfterEdit(
          queryClient,
          BACKUP_STORAGES_QUERY_KEY,
          StorageLocationsFields.name
        )(updatedLocation);
        handleCloseModal();
      },
    });
  };

  const handleCreateBackup = (data: BackupStorage) => {
    createBackupStorage(data, {
      onSuccess: (newLocation) => {
        updateDataAfterCreate(
          queryClient,
          BACKUP_STORAGES_QUERY_KEY
        )(newLocation);
        handleCloseModal();
      },
    });
  };

  const handleSubmit = (isEdit: boolean, data: BackupStorage) => {
    if (isEdit) {
      handleEditBackup(data);
    } else {
      handleCreateBackup(data);
    }
  };

  const handleDeleteBackup = (backupStorageName: string) => {
    setSelectedStorageName(backupStorageName);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleConfirmDelete = (backupStorageName: string) => {
    deleteBackupStorage(backupStorageName, {
      onSuccess: (_, locationName) => {
        updateDataAfterDelete(
          queryClient,
          BACKUP_STORAGES_QUERY_KEY,
          'name'
        )(_, locationName);
        handleCloseDeleteDialog();
      },
    });
  };
  return (
    <>
      <Table
        tableName="storageLocations"
        noDataMessage={Messages.noData}
        hideExpandAllIcon
        state={{
          columnVisibility: {
            description: false,
            url: false,
            accessKey: false,
            secretKey: false,
          },
          isLoading: isFetching,
        }}
        columns={columns}
        data={backupStorages}
        renderTopToolbarCustomActions={() => (
          <Button
            size="small"
            startIcon={<Add />}
            data-testid="add-backup-storage"
            variant="outlined"
            onClick={handleOpenCreateModal}
          >
            {Messages.addStorageLocationButton}
          </Button>
        )}
        enableRowActions
        renderRowActionMenuItems={({ row, closeMenu }) => [
          <MenuItem
            key={0}
            onClick={() => {
              handleOpenEditModal(row.original);
              closeMenu();
            }}
            sx={{ m: 0, display: 'flex', gap: 1, px: 2, py: '10px' }}
          >
            <Edit /> {Messages.edit}
          </MenuItem>,
          <MenuItem
            key={1}
            onClick={() => {
              handleDeleteBackup(row.original.name);
              closeMenu();
            }}
            sx={{ m: 0, display: 'flex', gap: 1, px: 2, py: '10px' }}
          >
            <Delete />
            {Messages.delete}
          </MenuItem>,
          // TODO: uncomment when api is ready
          // <MenuItem
          //   key={2}
          //   onClick={() => {}}
          //   sx={{ m: 0, display: 'flex', gap: 1 }}
          // >
          //   <AutoAwesome /> Set as default
          // </MenuItem>,
        ]}
        renderDetailPanel={({ row }) => (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'start',
              alignItems: 'start',
              gap: '50px',
            }}
          >
            <Box>
              <LabelValue label={Messages.url} value={row.original.url} />
              <LabelValue
                label={Messages.description}
                value={row.original.description}
              />
            </Box>
            {/* TODO: uncomment when endpoint is ready
            <Box>
              <LabelValue label="Access key" value={row.original.accessKey} />
              <LabelValue label="Secret key" value={row.original.secretKey} />
            </Box>  */}
          </Box>
        )}
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
          isOpen={openDeleteDialog}
          selectedId={selectedStorageName}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteDialog.header}
          handleConfirm={handleConfirmDelete}
          disabledButtons={deletingBackupStorage}
        >
          {Messages.deleteDialog.content(selectedStorageName)}
        </ConfirmDialog>
      )}
    </>
  );
};
