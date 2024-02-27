import { DbType } from '@percona/types';
import { AutoCompleteAutoFill } from 'components/auto-complete-auto-fill/auto-complete-auto-fill';
import { DbWizardFormFields } from 'pages/database-form/database-form.types';
import { Messages as StorageLocationMessages } from 'components/schedule-form/schedule-form.messages';
import { Typography } from '@mui/material';
import { Messages } from './pitr.messages';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages';
import { useFormContext } from 'react-hook-form';

const PitrStorage = () => {
  const { watch, setValue } = useFormContext();
  const [
    pitrEnabled,
    storageLocation,
    pitrStorageLocation,
    dbType,
    selectedNamespace,
  ] = watch([
    DbWizardFormFields.pitrEnabled,
    DbWizardFormFields.storageLocation,
    DbWizardFormFields.pitrStorageLocation,
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

  if (!pitrStorageLocation) {
    setValue(DbWizardFormFields.pitrStorageLocation, storageLocation);
  }

  return (
    <Typography variant="body1">
      {Messages.matchedStorageType(
        typeof pitrStorageLocation === 'string'
          ? pitrStorageLocation
          : pitrStorageLocation.name
      )}
    </Typography>
  );
};
export default PitrStorage;
