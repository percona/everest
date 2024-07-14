import { DbType } from '@percona/types';
import { AutoCompleteAutoFill } from 'components/auto-complete-auto-fill/auto-complete-auto-fill';
import { AutoCompleteAutoFillProps } from 'components/auto-complete-auto-fill/auto-complete-auto-fill.types';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages';
import { useDbBackups } from 'hooks/api/backups/useBackups';
import { Schedule } from 'shared-types/dbCluster.types';

type Props<T> = {
  dbClusterName?: string;
  namespace: string;
  dbType: DbType;
  schedules: Schedule[];
  autoFillProps?: Partial<AutoCompleteAutoFillProps<T>>;
};

const BackupStoragesInput = <T,>({
  namespace,
  dbClusterName,
  dbType,
  schedules,
  ...rest
}: Props<T>) => {
  const { data: backupStorages = [], isFetching: fetchingStorages } =
    useBackupStoragesByNamespace(namespace);
  const { data: backups = [], isFetching: fetchingBackups } = useDbBackups(
    dbClusterName!,
    namespace,
    {
      enabled: !!dbClusterName && dbType === DbType.Postresql,
    }
  );

  const isFetching = fetchingStorages || fetchingBackups;
  const storagesInUse = [
    ...backups.map((backup) => backup.backupStorageName),
    ...schedules.map((schedule) => schedule.backupStorageName),
  ];
  const uniqueStoragesInUse = [...new Set(storagesInUse)];
  const pgLimitAchieved =
    dbType === DbType.Postresql && uniqueStoragesInUse.length >= 3;
  const storagesToShow = pgLimitAchieved
    ? backupStorages.filter((storage) =>
        uniqueStoragesInUse.includes(storage.name)
      )
    : backupStorages;

  return (
    <AutoCompleteAutoFill
      name="storageLocation"
      textFieldProps={{
        label: 'Backup storage',
        // TODO change helper text
        helperText: pgLimitAchieved ? '<SLOTS ACHIEVED>' : '',
      }}
      loading={isFetching}
      options={storagesToShow}
      enableFillFirst
      autoCompleteProps={{
        isOptionEqualToValue: (option, value) => option.name === value.name,
        getOptionLabel: (option) =>
          typeof option === 'string' ? option : option.name,
      }}
      {...rest}
    />
  );
};

export default BackupStoragesInput;
