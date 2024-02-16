import { PreviewContentText } from '../preview-section';
import { getTimeSelectionPreviewMessage } from '../database.preview.messages';
import { BackupStepType } from '../../database-form-schema.ts';
import { useDatabasePageDefaultValues } from '../../useDatabaseFormDefaultValues.ts';
import { useDatabasePageMode } from '../../useDatabasePageMode.ts';
import { getFormValuesFromCronExpression } from '../../../../components/time-selection/time-selection.utils.ts';

export const BackupsPreviewSection = (backupsSection: BackupStepType) => {
  const mode = useDatabasePageMode();
  const { dbClusterData } = useDatabasePageDefaultValues(mode);
  const { selectedTime, hour, minute, amPm, weekDay, onDay, backupsEnabled } =
    backupsSection;

  const schedules = dbClusterData?.spec?.backup?.schedules || [];
  const schedulesPreviewList = schedules.map((item) =>
    getTimeSelectionPreviewMessage(
      getFormValuesFromCronExpression(item.schedule)
    )
  );
  const showBackupPreview =
    (mode === 'new' ||
      mode === 'restoreFromBackup' ||
      (mode === 'edit' && schedules?.length < 2)) &&
    backupsEnabled;

  return (
    <>
      {showBackupPreview && (
        <PreviewContentText
          text={getTimeSelectionPreviewMessage({
            selectedTime,
            minute,
            hour,
            amPm,
            onDay,
            weekDay,
          })}
        />
      )}
      {backupsEnabled &&
        mode === 'edit' &&
        schedules?.length > 1 &&
        schedulesPreviewList.map((item) => <PreviewContentText text={item} />)}
      {!backupsEnabled && (
        <PreviewContentText text="Disabled" dataTestId="empty-backups" />
      )}
    </>
  );
};
