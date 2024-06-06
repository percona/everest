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
import { PITR_DATE_FORMAT } from 'consts';
import { format } from 'date-fns';
import { useDbBackups, useDbClusterPitr } from 'hooks/api/backups/useBackups';
import {
  useDbClusterRestoreFromBackup,
  useDbClusterRestoreFromPointInTime,
} from 'hooks/api/restores/useDbClusterRestore';
import { FieldValues } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { BackupStatus } from 'shared-types/backups.types';
import { DbCluster } from 'shared-types/dbCluster.types';
import {
  BackuptypeValues,
  RestoreDbFields,
  defaultValues,
  schema,
} from './restore-db-modal-schema';
import { Messages } from './restore-db-modal.messages';

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
  const { data: backups = [], isLoading } = useDbBackups(
    dbCluster.metadata.name,
    namespace
  );
  const { data: pitrData } = useDbClusterPitr(
    dbCluster.metadata.name,
    namespace
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
        pitrData?.earliestDate || new Date(),
        pitrData?.latestDate || new Date(),
        !!pitrData?.gaps
      )}
      submitting={restoringFromBackup || restoringFromPointInTime}
      defaultValues={defaultValues}
      values={{
        ...defaultValues,
        backupName: backupName ?? '',
        pitrBackup: pitrData?.latestDate,
      }}
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
              },
            });
          }
        } else {
          if (backupType === BackuptypeValues.fromBackup) {
            restoreBackupFromBackup(
              { backupName, namespace },
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
      {({ watch, resetField }) => (
        <LoadableChildren loading={isLoading}>
          <Typography variant="body1">
            {isNewClusterMode ? Messages.subHeadCreate : Messages.subHead}
          </Typography>
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
                  pitrData?.latestBackupName !==
                    watch(RestoreDbFields.backupName),
              },
            ]}
          />
          {watch(RestoreDbFields.backupType) === BackuptypeValues.fromBackup ? (
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
                  } - ${value.created?.toLocaleString('en-US')}`;
                  return (
                    <MenuItem key={value.name} value={value.name}>
                      {valueWithTime}
                    </MenuItem>
                  );
                })}
            </SelectInput>
          ) : (
            <>
              {pitrData &&
                DbType.Postresql ===
                  dbEngineToDbType(dbCluster.spec.engine.type) && (
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
                        dbCluster.spec.backup?.pitr?.backupStorageName || ''
                      )}
                </Alert>
              )}

              {!pitrData?.gaps && (
                <DateTimePickerInput
                  views={[
                    'year',
                    'month',
                    'day',
                    'hours',
                    'minutes',
                    'seconds',
                  ]}
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
      )}
    </FormDialog>
  );
};

export default RestoreDbModal;
