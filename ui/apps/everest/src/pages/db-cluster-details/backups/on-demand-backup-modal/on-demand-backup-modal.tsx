import { FormDialog } from 'components/form-dialog';
import {
  BACKUPS_QUERY_KEY,
  useCreateBackupOnDemand,
  useDbBackups,
} from 'hooks/api/backups/useBackups';
import { useContext, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  GetBackupsPayload,
  SingleBackupPayload,
} from 'shared-types/backups.types';
import { Messages } from '../../db-cluster-details.messages.ts';
import { OnDemandBackupFieldsWrapper } from './on-demand-backup-fields-wrapper.tsx';
import {
  BackupFormData,
  defaultValuesFc,
  schema,
} from './on-demand-backup-modal.types.ts';
import { ScheduleModalContext } from '../backups.context.ts';
import { Typography } from '@mui/material';

export const OnDemandBackupModal = () => {
  const queryClient = useQueryClient();
  const { dbClusterName, namespace = '' } = useParams();

  const { openOnDemandModal, setOpenOnDemandModal, cluster } =
    useContext(ScheduleModalContext);

  const { data: backups = [] } = useDbBackups(dbClusterName!, namespace, cluster);
  const backupNames = backups.map((item) => item.name);
  const { mutate: createBackupOnDemand, isPending: creatingBackup } =
    useCreateBackupOnDemand(dbClusterName!, namespace, cluster);

  const handleSubmit = (data: BackupFormData) => {
    createBackupOnDemand(data, {
      onSuccess(newBackup: SingleBackupPayload) {
        queryClient.setQueryData<GetBackupsPayload | undefined>(
          [BACKUPS_QUERY_KEY, namespace, dbClusterName, cluster],
          (oldData) => {
            if (!oldData) {
              return undefined;
            }

            return {
              items: [newBackup, ...oldData.items],
            };
          }
        );
        setOpenOnDemandModal(false);
      },
    });
  };

  const values = useMemo(() => defaultValuesFc(), []);

  return (
    <FormDialog
      isOpen={openOnDemandModal}
      closeModal={() => setOpenOnDemandModal(false)}
      headerMessage={Messages.onDemandBackupModal.headerMessage}
      onSubmit={handleSubmit}
      submitting={creatingBackup}
      submitMessage={Messages.onDemandBackupModal.submitMessage}
      schema={schema(backupNames)}
      values={values}
      size="XL"
    >
      <Typography variant="body1">
        {Messages.onDemandBackupModal.subHead}
      </Typography>
      <OnDemandBackupFieldsWrapper />
    </FormDialog>
  );
};
