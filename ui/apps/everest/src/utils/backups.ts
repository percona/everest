import { BACKUP_STATE_TO_STATUS } from 'consts';
import { BackupStatus } from 'shared-types/backups.types';

export const mapBackupState = (backupState: string) =>
  BACKUP_STATE_TO_STATUS[backupState] || BackupStatus.UNKNOWN;
