import { ScheduleFormData } from '../schedule-form/schedule-form-schema';
import { Schedule } from '../../shared-types/dbCluster.types';
import { DbEngineType } from '@percona/types';

export interface ScheduledModalDialogProps {
  openScheduleModal: boolean;
  handleCloseScheduledBackupModal: () => void;
  mode: 'new' | 'edit';
  handleSubmit: (data: ScheduleFormData) => void;
  isPending: boolean;
  schedules: Schedule[];
  selectedScheduleName: string;
  setSelectedScheduleName: React.Dispatch<React.SetStateAction<string>>;
  namespace: string;
  dbEngineType: DbEngineType;
  activeStorage: string;
}
