import { TextInput } from '@percona/ui-lib';
import { AutoCompleteAutoFill } from 'components/auto-complete-auto-fill/auto-complete-auto-fill';
import { ScheduleFormFields } from 'components/schedule-form/schedule-form.types';
import LogicalPhysicalRadioGroup from 'components/logical-physical-radio-group';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages.ts';
import { useContext, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Messages } from '../../db-cluster-details.messages.ts';
import { BackupFields } from './on-demand-backup-modal.types.ts';
import { DbEngineType } from '@percona/types';
import { ScheduleModalContext } from '../backups.context.ts';

export const OnDemandBackupFieldsWrapper = () => {
  const { dbCluster } = useContext(ScheduleModalContext);
  const {
    metadata: { namespace },
    status,
    spec: {
      engine: { type },
    },
  } = dbCluster;
  const { setValue } = useFormContext();
  const { data: backupStorages = [], isFetching } =
    useBackupStoragesByNamespace(namespace);
  const dbClusterActiveStorage = status?.activeStorage;

  useEffect(() => {
    if (dbClusterActiveStorage) {
      setValue(ScheduleFormFields.storageLocation, {
        name: dbClusterActiveStorage,
      });
    }
  }, [dbClusterActiveStorage]);

  return (
    <>
      {type === DbEngineType.PSMDB && <LogicalPhysicalRadioGroup />}
      <TextInput
        name={BackupFields.name}
        label={Messages.onDemandBackupModal.backupName}
        isRequired
      />
      <AutoCompleteAutoFill
        name={BackupFields.storageLocation}
        label={Messages.onDemandBackupModal.storageLocation}
        loading={isFetching}
        options={backupStorages}
        enableFillFirst
        isRequired
        disabled={!!dbClusterActiveStorage}
      />
    </>
  );
};
