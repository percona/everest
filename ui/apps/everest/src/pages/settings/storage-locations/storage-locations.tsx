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
import {
  StorageLocationsFields,
  BackupStorageTableElement,
} from './storage-locations.types';
import {
  convertBackupStoragesPayloadToTableFormat,
  convertStoragesType,
} from './storage-locations.utils';
import { useNamespaces } from 'hooks/api/namespaces';
import { useGetPermissions } from 'utils/useGetPermissions';
import TableActionsMenu from '../../../components/table-actions-menu';
import { StorageLocationsActionButtons } from './storage-locations-menu-actions';

export const StorageLocations = () => {
  const queryClient = useQueryClient();

  const { data: namespaces = [] } = useNamespaces();
  const backupStorages = useBackupStorages(namespaces);

  const backupStoragesLoading = backupStorages.some(
    (result) => result.queryResult.isLoading
  );

  const tableData = useMemo(
    () => convertBackupStoragesPayloadToTableFormat(backupStorages),
    [backupStorages]
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

  const columns = useMemo<MRT_ColumnDef<BackupStorageTableElement>[]>(
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
        accessorKey: StorageLocationsFields.namespace,
        header: Messages.namespace,
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

  const { canCreate } = useGetPermissions({ resource: 'backup-storages' });

  const handleOpenCreateModal = () => {
    setSelectedStorageLocation(undefined);
    setOpenCreateEditModal(true);
  };

  const handleOpenEditModal = (storageLocation: BackupStorageTableElement) => {
    setSelectedStorageLocation(storageLocation.raw);
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
        updateDataAfterCreate(queryClient, [BACKUP_STORAGES_QUERY_KEY])(
          newLocation
        );
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

  const handleDeleteBackup = (backupStorageName: string, namespace: string) => {
    setSelectedStorageName(backupStorageName);
    setSelectedStorageNamespace(namespace);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleConfirmDelete = (
    backupStorageName: string,
    namespace: string
  ) => {
    deleteBackupStorage(
      { backupStorageId: backupStorageName, namespace: namespace },
      {
        onSuccess: (_, locationName) => {
          updateDataAfterDelete(
            queryClient,
            BACKUP_STORAGES_QUERY_KEY,
            'name'
          )(_, locationName.backupStorageId);
          handleCloseDeleteDialog();
        },
      }
    );
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
          isLoading: backupStoragesLoading,
        }}
        columns={columns}
        data={tableData}
        renderTopToolbarCustomActions={() =>
          canCreate && (
            <Button
              size="small"
              startIcon={<Add />}
              data-testid="add-backup-storage"
              variant="outlined"
              onClick={handleOpenCreateModal}
              sx={{ display: 'flex' }}
            >
              {Messages.addStorageLocationButton}
            </Button>
          )
        }
        enableRowActions
        renderRowActions={({ row }) => {
          const menuItems = StorageLocationsActionButtons(
            row,
            handleOpenEditModal,
            handleDeleteBackup
          );
          return <TableActionsMenu menuItems={menuItems} />;
        }}
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
          selectedNamespace={selectedStorageNamespace}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteDialog.header}
          handleConfirmNamespace={handleConfirmDelete}
          disabledButtons={deletingBackupStorage}
        >
          {Messages.deleteDialog.content(selectedStorageName)}
        </ConfirmDialog>
      )}
    </>
  );
};
