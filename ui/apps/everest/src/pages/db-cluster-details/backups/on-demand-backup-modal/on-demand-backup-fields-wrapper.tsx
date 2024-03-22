import { TextInput } from '@percona/ui-lib';
import { AutoCompleteAutoFill } from 'components/auto-complete-auto-fill/auto-complete-auto-fill';
import LogicalPhysicalRadioGroup from 'components/logical-physical-radio-group';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages.ts';
import { useContext, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Messages } from '../../db-cluster-details.messages.ts';
import { BackupFields } from './on-demand-backup-modal.types.ts';
import { DbEngineType } from '@percona/types';
import { ScheduleModalContext } from '../backups.context.ts';
import { Typography } from '@mui/material';

export const OnDemandBackupFieldsWrapper = () => {
  const { dbCluster } = useContext(ScheduleModalContext);
  const {
    metadata: { namespace },
    status,
    spec: {
      engine: { type },
    },
  } = dbCluster;
  const { setValue, trigger } = useFormContext();
  const { data: backupStorages = [], isFetching } =
    useBackupStoragesByNamespace(namespace);
  const dbClusterActiveStorage = status?.activeStorage;

  useEffect(() => {
    if (dbClusterActiveStorage) {
      setValue(BackupFields.storageLocation, {
        name: dbClusterActiveStorage,
      });
      trigger(BackupFields.storageLocation);
    }
  }, [dbClusterActiveStorage]);

  return (
    <>
      {type === DbEngineType.PSMDB && <LogicalPhysicalRadioGroup />}
      <Typography variant="sectionHeading" mt={3} mb={2}>
        {Messages.onDemandBackupModal.backupDetails}
      </Typography>
      <TextInput
        name={BackupFields.name}
        textFieldProps={{
          sx: { mb: 3 },
          label: Messages.onDemandBackupModal.backupName,
        }}
        isRequired
      />
      <AutoCompleteAutoFill
        name={BackupFields.storageLocation}
        textFieldProps={{
          label: Messages.onDemandBackupModal.storageLocation,
        }}
        loading={isFetching}
        options={backupStorages}
        enableFillFirst
        isRequired
        disabled={!!dbClusterActiveStorage}
      />
    </>
  );
};
