import { DbType } from '@percona/types';
import { AutoCompleteAutoFill } from 'components/auto-complete-auto-fill/auto-complete-auto-fill';
import { DbWizardFormFields } from 'pages/database-form/database-form.types';
import { Messages as StorageLocationMessages } from 'components/schedule-form-dialog/schedule-form/schedule-form.messages';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages';
import { useFormContext } from 'react-hook-form';
import { useEffect } from 'react';

const PitrStorage = () => {
  const { watch, setValue } = useFormContext();
  const [pitrEnabled, pitrStorageLocation, dbType, selectedNamespace] = watch([
    DbWizardFormFields.pitrEnabled,
    DbWizardFormFields.pitrStorageLocation,
    DbWizardFormFields.dbType,
    DbWizardFormFields.k8sNamespace,
  ]);

  const { data: backupStorages = [], isFetching: loadingBackupStorages } =
    useBackupStoragesByNamespace(selectedNamespace);

  useEffect(() => {
    if (
      pitrStorageLocation !== null &&
      !pitrStorageLocation &&
      backupStorages[0]
    ) {
      setValue(DbWizardFormFields.pitrStorageLocation, backupStorages[0]);
    }
  }, [pitrStorageLocation, backupStorages]);

  if (!pitrEnabled) {
    return null;
  }

  if (dbType === DbType.Mysql) {
    return (
      <AutoCompleteAutoFill
        name={DbWizardFormFields.pitrStorageLocation}
        label={StorageLocationMessages.storageLocation.label}
        loading={loadingBackupStorages}
        options={backupStorages}
        isRequired
        enableFillFirst
      />
    );
  }
};
export default PitrStorage;
