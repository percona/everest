import { useState } from 'react';
import ActionableAlert from '..';
import { Messages } from './BackupsActionableAlert.messages';
import { BackupsActionableAlertProps } from './BackupsActionableAlert.types';
import { CreateEditModalStorage } from 'pages/settings/storage-locations/createEditModal/create-edit-modal';
import {
  BACKUP_STORAGES_QUERY_KEY,
  useCreateBackupStorage,
} from 'hooks/api/backup-storages/useBackupStorages';
import { updateDataAfterCreate } from 'utils/generalOptimisticDataUpdate';
import { useQueryClient } from '@tanstack/react-query';
import { BackupStorage } from 'shared-types/backupStorages.types';

const BackupsActionableAlert = ({ namespace }: BackupsActionableAlertProps) => {
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const { mutate: createBackupStorage, isPending: creatingBackupStorage } =
    useCreateBackupStorage();
  const queryClient = useQueryClient();

  const handleCloseModal = () => {
    setOpenCreateEditModal(false);
  };

  const handleSubmit = (_: boolean, data: BackupStorage) => {
    createBackupStorage(data, {
      onSuccess: (newLocation) => {
        updateDataAfterCreate(queryClient, [
          BACKUP_STORAGES_QUERY_KEY,
          namespace,
        ])(newLocation);
        handleCloseModal();
      },
    });
  };

  return (
    <>
      <ActionableAlert
        message={Messages.noStoragesMessage}
        buttonMessage={Messages.addStorage}
        data-testid="no-storage-message"
        onClick={() => setOpenCreateEditModal(true)}
      />
      {openCreateEditModal && (
        <CreateEditModalStorage
          open={openCreateEditModal}
          handleCloseModal={handleCloseModal}
          handleSubmitModal={handleSubmit}
          isLoading={creatingBackupStorage}
        />
      )}
    </>
  );
};

export default BackupsActionableAlert;
