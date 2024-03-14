import { DbType } from '@percona/types';
import { AutoCompleteAutoFill } from 'components/auto-complete-auto-fill/auto-complete-auto-fill';
import { DbWizardFormFields } from 'pages/database-form/database-form.types';
import { Messages as StorageLocationMessages } from 'components/schedule-form/schedule-form.messages';
import { Typography } from '@mui/material';
import { Messages } from './pitr.messages';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages';
import { useFormContext } from 'react-hook-form';
import { useEffect } from 'react';

const PitrStorage = () => {
  const { watch, setValue, getValues } = useFormContext();
  const [dbType, selectedNamespace, storageLocation] = getValues([
    DbWizardFormFields.dbType,
    DbWizardFormFields.k8sNamespace,
    DbWizardFormFields.storageLocation,
  ]);
  const [pitrEnabled, pitrStorageLocation] = watch([
    DbWizardFormFields.pitrEnabled,
    DbWizardFormFields.pitrStorageLocation,
  ]);

  const { data: backupStorages = [], isFetching: loadingBackupStorages } =
    useBackupStoragesByNamespace(selectedNamespace);

  useEffect(() => {
    if (!pitrStorageLocation) {
      setValue(DbWizardFormFields.pitrStorageLocation, storageLocation);
    }
  }, [pitrStorageLocation]);

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

  const storageLocationValue = pitrStorageLocation || storageLocation;

  return (
    <Typography variant="body1">
      {Messages.matchedStorageType(
        typeof storageLocationValue === 'string'
          ? storageLocationValue
          : storageLocationValue?.name
      )}
    </Typography>
  );
};
export default PitrStorage;
