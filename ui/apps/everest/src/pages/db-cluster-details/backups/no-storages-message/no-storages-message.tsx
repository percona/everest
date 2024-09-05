import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, Button, Typography } from '@mui/material';
import {
  BACKUP_STORAGES_QUERY_KEY,
  useCreateBackupStorage,
} from 'hooks/api/backup-storages/useBackupStorages';
import { CreateEditModalStorage } from 'pages/settings/storage-locations/createEditModal/create-edit-modal';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BackupStorage } from 'shared-types/backupStorages.types';
import { updateDataAfterCreate } from 'utils/generalOptimisticDataUpdate';
import { Messages } from '../backups.messages';
import { useGetPermittedNamespaces } from 'utils/useGetPermissions';

export const NoStoragesMessage = () => {
  const queryClient = useQueryClient();
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const { mutate: createBackupStorage, isPending: creatingBackupStorage } =
    useCreateBackupStorage();

  const handleSubmit = (_: boolean, data: BackupStorage) => {
    handleCreateBackup(data);
  };

  const handleCreateBackup = (data: BackupStorage) => {
    createBackupStorage(data, {
      onSuccess: (newLocation) => {
        updateDataAfterCreate(queryClient, [
          BACKUP_STORAGES_QUERY_KEY,
          data.namespace,
        ])(newLocation);
        handleCloseModal();
      },
    });
  };

  const handleCloseModal = () => {
    setOpenCreateEditModal(false);
  };

  const { canCreate } = useGetPermittedNamespaces({
    resource: 'backup-storages',
  });
  return (
    <Box
      sx={{
        display: 'flex',
        py: 6,
        px: 0,
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        alignSelf: 'stretch',
      }}
    >
      <Box sx={{ fontSize: '100px', lineHeight: 0 }}>
        <WarningAmberIcon fontSize="inherit" />
      </Box>
      <Typography variant="body1">{Messages.noStoragesMessage}</Typography>
      <Button
        sx={{ my: 4 }}
        variant="contained"
        onClick={() => setOpenCreateEditModal(true)}
        disabled={!canCreate}
      >
        {Messages.addStorage}
      </Button>
      {openCreateEditModal && (
        <CreateEditModalStorage
          open={openCreateEditModal}
          handleCloseModal={handleCloseModal}
          handleSubmitModal={handleSubmit}
          isLoading={creatingBackupStorage}
        />
      )}
    </Box>
  );
};
