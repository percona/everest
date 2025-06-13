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
import { useRBACPermissions } from 'hooks/rbac';

const BackupsActionableAlert = ({ namespace, cluster = 'in-cluster' }: BackupsActionableAlertProps) => {
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const { mutate: createBackupStorage, isPending: creatingBackupStorage } =
    useCreateBackupStorage();
  const queryClient = useQueryClient();
  const { canCreate } = useRBACPermissions('backup-storages', `${namespace}/*`);
  const handleCloseModal = () => {
    setOpenCreateEditModal(false);
  };

  const handleSubmit = (_: boolean, data: BackupStorage) => {
    createBackupStorage({ ...data, cluster }, {
      onSuccess: (newLocation) => {
        updateDataAfterCreate(queryClient, [
          BACKUP_STORAGES_QUERY_KEY,
          cluster,
          namespace,
        ])(newLocation as BackupStorage);
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
        {...(!canCreate && { action: undefined })}
      />
      {openCreateEditModal && (
        <CreateEditModalStorage
          open={openCreateEditModal}
          handleCloseModal={handleCloseModal}
          handleSubmitModal={handleSubmit}
          isLoading={creatingBackupStorage}
          prefillNamespace={namespace}
        />
      )}
    </>
  );
};

export default BackupsActionableAlert;
