import { FormDialog } from 'components/form-dialog';
import {
  BACKUPS_QUERY_KEY,
  useCreateBackupOnDemand,
} from 'hooks/api/backups/useBackups';
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  GetBackupsPayload,
  SingleBackupPayload,
} from 'shared-types/backups.types';
import { Messages } from '../../../db-cluster-details.messages.ts';
import { OnDemandBackupFieldsWrapper } from './on-demand-backup-fields-wrapper.tsx';
import {
  BackupFormData,
  OnDemandBackupModalProps,
  defaultValuesFc,
  schema,
} from './on-demand-backup-modal.types';

export const OnDemandBackupModal = ({
  open,
  handleClose,
}: OnDemandBackupModalProps) => {
  const queryClient = useQueryClient();
  const { dbClusterName, namespace = '' } = useParams();
  const { mutate: createBackupOnDemand, isPending: creatingBackup } =
    useCreateBackupOnDemand(dbClusterName!, namespace);

  const handleSubmit = (data: BackupFormData) => {
    createBackupOnDemand(data, {
      onSuccess(newBackup: SingleBackupPayload) {
        queryClient.setQueryData<GetBackupsPayload | undefined>(
          [BACKUPS_QUERY_KEY, dbClusterName],
          (oldData) => {
            if (!oldData) {
              return undefined;
            }

            return {
              items: [newBackup, ...oldData.items],
            };
          }
        );
        handleClose();
      },
    });
  };

  const values = useMemo(() => defaultValuesFc(), []);

  return (
    <FormDialog
      isOpen={open}
      closeModal={handleClose}
      headerMessage={Messages.onDemandBackupModal.headerMessage}
      onSubmit={handleSubmit}
      submitting={creatingBackup}
      submitMessage={Messages.onDemandBackupModal.submitMessage}
      schema={schema}
      values={values}
      size="XL"
      subHead2={Messages.onDemandBackupModal.subHead}
    >
      <OnDemandBackupFieldsWrapper />
    </FormDialog>
  );
};
