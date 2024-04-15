import { PreviewContentText } from '../preview-section';
import { getTimeSelectionPreviewMessage } from '../database.preview.messages';
import { BackupStepType } from '../../database-form-schema.ts';
import { getFormValuesFromCronExpression } from 'components/time-selection/time-selection.utils.ts';

export const BackupsPreviewSection = (backupsSection: BackupStepType) => {
  const { backupsEnabled, schedules } = backupsSection;
  const schedulesPreviewList = schedules.map((item) =>
    getTimeSelectionPreviewMessage(
      getFormValuesFromCronExpression(item.schedule)
    )
  );

  return (
    <>
      {backupsEnabled &&
        schedulesPreviewList.map((item) => (
          <PreviewContentText key={`${item}`} text={item} />
        ))}
      {!backupsEnabled && (
        <PreviewContentText text="Disabled" dataTestId="empty-backups" />
      )}
    </>
  );
};
