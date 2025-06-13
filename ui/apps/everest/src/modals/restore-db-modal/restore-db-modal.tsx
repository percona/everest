import { Alert, MenuItem, Typography } from '@mui/material';
import { DbType } from '@percona/types';
import {
  DateTimePickerInput,
  LoadableChildren,
  RadioGroup,
  SelectInput,
} from '@percona/ui-lib';
import { dbEngineToDbType } from '@percona/utils';
import ActionableAlert from 'components/actionable-alert';
import { FormDialog } from 'components/form-dialog';
import { FormDialogProps } from 'components/form-dialog/form-dialog.types';
import { DATE_FORMAT, PITR_DATE_FORMAT } from 'consts';
import { format } from 'date-fns';
import {
  useDbBackups,
  useDbClusterPitr,
} from 'hooks/api/backups/useBackups';
import {
  useDbClusterRestoreFromBackup,
  useDbClusterRestoreFromPointInTime,
} from 'hooks/api/restores/useDbClusterRestore';
import { FieldValues, useFormContext } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Backup,
  BackupStatus,
  DatabaseClusterPitr,
} from 'shared-types/backups.types';
import { DbCluster } from 'shared-types/dbCluster.types';
import {
  BackuptypeValues,
  RestoreDbFields,
  defaultValues,
  schema,
} from './restore-db-modal-schema';
import { Messages } from './restore-db-modal.messages';
import { useEffect } from 'react';

const ModalContent = ({
  backupName,
  header,
  dbType,
  isLoading,
  pitrData,
  backups,
  backupStorageName,
}: {
  backupName?: string;
  isLoading: boolean;
  header: string;
  dbType: DbType;
  pitrData?: DatabaseClusterPitr;
  backups: Backup[];
  backupStorageName?: string;
}) => {
  const { watch, resetField, setValue } = useFormContext();
  const backupType: BackuptypeValues = watch(RestoreDbFields.backupType);

  useEffect(() => {
    if (pitrData) {
      setValue(RestoreDbFields.pitrBackup, pitrData.latestDate);
    }
  }, [pitrData, setValue]);

  return (
    <LoadableChildren loading={isLoading}>
      <Typography variant="body1">{header}</Typography>
      <RadioGroup
        name={RestoreDbFields.backupType}
        radioGroupFieldProps={{
          sx: {
            ml: 1,
            display: 'flex',
            gap: 3,
            '& label': {
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              padding: 1,
              '& span': {
                padding: '0px !important',
              },
            },
          },
        }}
        options={[
          {
            label: Messages.fromBackup,
            value: BackuptypeValues.fromBackup,
            radioProps: {
              onClick: () => {
                resetField(RestoreDbFields.pitrBackup, {
                  keepError: false,
                });
              },
            },
          },
          {
            label: Messages.fromPitr,
            value: BackuptypeValues.fromPitr,
            radioProps: {
              onClick: () => {
                resetField(RestoreDbFields.backupName, {
                  keepError: false,
                });
              },
            },
            disabled:
              !!backupName &&
              pitrData?.latestBackupName !== watch(RestoreDbFields.backupName),
          },
        ]}
      />
      {backupType === BackuptypeValues.fromBackup ? (
        <SelectInput
          label={Messages.selectBackup}
          name={RestoreDbFields.backupName}
          selectFieldProps={{
            labelId: 'restore-backup',
            label: Messages.selectBackup,
          }}
        >
          {backups
            .filter((value) => value.state === BackupStatus.OK)
            .sort((a, b) => {
              if (a.created && b.created) {
                return b.created.valueOf() - a.created.valueOf();
              }
              return -1;
            })
            .map((value) => {
              const valueWithTime = `${
                value.name
              } - ${format(value.created!, DATE_FORMAT)}`;
              return (
                <MenuItem key={value.name} value={value.name}>
                  {valueWithTime}
                </MenuItem>
              );
            })}
        </SelectInput>
      ) : (
        <>
          {pitrData && dbType === DbType.Postresql && (
            <ActionableAlert
              sx={{ mt: 1.5 }}
              message={Messages.pitrLimitationAlert}
              buttonMessage={Messages.seeDocs}
              onClick={() =>
                window.open(
                  'https://docs.percona.com/everest/use/createBackups/EnablePITR.html#limitation',
                  '_blank',
                  'noopener'
                )
              }
              buttonProps={{
                sx: { whiteSpace: 'nowrap' },
              }}
            />
          )}
          {pitrData && (
            <Alert
              sx={{ mt: 1.5, mb: 1.5 }}
              severity={pitrData?.gaps ? 'error' : 'info'}
            >
              {pitrData?.gaps
                ? Messages.gapDisclaimer
                : Messages.pitrDisclaimer(
                    format(
                      pitrData?.earliestDate || new Date(),
                      PITR_DATE_FORMAT
                    ),
                    format(
                      pitrData?.latestDate || new Date(),
                      PITR_DATE_FORMAT
                    ),
                    backupStorageName || ''
                  )}
            </Alert>
          )}

          {!pitrData?.gaps && (
            <DateTimePickerInput
              ampm={false}
              views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
              timeSteps={{ hours: 1, minutes: 1, seconds: 1 }}
              disableFuture
              disabled={!pitrData}
              minDate={new Date(pitrData?.earliestDate || new Date())}
              maxDate={new Date(pitrData?.latestDate || new Date())}
              format={PITR_DATE_FORMAT}
              name={RestoreDbFields.pitrBackup}
              label={pitrData ? 'Select point in time' : 'No options'}
              sx={{ mt: 1.5 }}
            />
          )}
        </>
      )}
    </LoadableChildren>
  );
};

const RestoreDbModal = <T extends FieldValues>({
  closeModal,
  isOpen,
  dbCluster,
  namespace,
  isNewClusterMode,
  backupName,
}: Pick<FormDialogProps<T>, 'closeModal' | 'isOpen'> & {
  dbCluster: DbCluster;
  namespace: string;
  isNewClusterMode: boolean;
  backupName?: string;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const cluster = location.state?.cluster || 'in-cluster';
  const { data: backups = [], isFetching: isLoading } = useDbBackups(
    dbCluster.metadata.name,
    namespace,
    cluster,
    {
      enabled: !!dbCluster.metadata.name,
    }
  );
  const { data: pitrData } = useDbClusterPitr(
    dbCluster.metadata.name,
    namespace,
    cluster
  );

  const { mutate: restoreBackupFromBackup, isPending: restoringFromBackup } =
    useDbClusterRestoreFromBackup(dbCluster.metadata.name);
  const {
    mutate: restoreBackupFromPointInTime,
    isPending: restoringFromPointInTime,
  } = useDbClusterRestoreFromPointInTime(dbCluster.metadata.name);

  return (
    <FormDialog
      size="XXXL"
      isOpen={isOpen}
      dataTestId="restore-modal"
      closeModal={closeModal}
      headerMessage={
        isNewClusterMode ? Messages.headerMessageCreate : Messages.headerMessage
      }
      schema={schema(
        !!pitrData?.gaps,
        pitrData?.earliestDate,
        pitrData?.latestDate
      )}
      submitting={restoringFromBackup || restoringFromPointInTime}
      defaultValues={{ ...defaultValues, backupName: backupName || '' }}
      onSubmit={({ backupName, backupType, pitrBackup }) => {
        let pointInTimeDate = '';
        let pitrBackupName = '';
        if (pitrData) {
          pitrBackupName = pitrData.latestBackupName;
        }

        if (pitrBackup && pitrBackup instanceof Date) {
          pointInTimeDate = pitrBackup.toISOString().split('.')[0] + 'Z';
        }
        if (isNewClusterMode) {
          closeModal();
          const selectedBackup = backups?.find(
            (backup) => backup.name === backupName
          );
          if (backupType === BackuptypeValues.fromBackup) {
            navigate('/databases/new', {
              state: {
                selectedDbCluster: dbCluster.metadata.name,
                backupName,
                namespace,
                backupStorageName: selectedBackup,
                cluster,
              },
            });
          } else {
            navigate('/databases/new', {
              state: {
                selectedDbCluster: dbCluster.metadata.name,
                backupName: pitrBackupName,
                namespace,
                backupStorageName: selectedBackup,
                pointInTimeDate: pointInTimeDate,
                cluster,
              },
            });
          }
        } else {
          if (backupType === BackuptypeValues.fromBackup) {
            restoreBackupFromBackup(
              { backupName, namespace, cluster },
              {
                onSuccess() {
                  closeModal();
                  navigate('/');
                },
              }
            );
          } else {
            restoreBackupFromPointInTime(
              {
                backupName: pitrBackupName,
                namespace,
                pointInTimeDate: pointInTimeDate,
                cluster,
              },
              {
                onSuccess() {
                  closeModal();
                  navigate('/');
                },
              }
            );
          }
        }
      }}
      submitMessage={isNewClusterMode ? Messages.create : Messages.restore}
    >
      <ModalContent
        isLoading={isLoading}
        header={isNewClusterMode ? Messages.subHeadCreate : Messages.subHead}
        dbType={dbEngineToDbType(dbCluster.spec.engine.type)}
        pitrData={pitrData}
        backups={backups}
        backupStorageName={dbCluster.spec.backup?.pitr?.backupStorageName}
      />
    </FormDialog>
  );
};

export default RestoreDbModal;
