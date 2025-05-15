import { DbType } from '@percona/types';
import { AutoCompleteAutoFill } from 'components/auto-complete-auto-fill/auto-complete-auto-fill';
import { DbWizardFormFields } from 'consts.ts';
import { Messages as StorageLocationMessages } from 'components/schedule-form-dialog/schedule-form/schedule-form.messages';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages';
import { useFormContext } from 'react-hook-form';

const PitrStorage = () => {
  const { watch } = useFormContext();
  const [pitrEnabled, dbType, selectedNamespace] = watch([
    DbWizardFormFields.pitrEnabled,
    DbWizardFormFields.dbType,
    DbWizardFormFields.k8sNamespace,
  ]);

  const { data: backupStorages = [], isFetching: loadingBackupStorages } =
    useBackupStoragesByNamespace(selectedNamespace);

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
