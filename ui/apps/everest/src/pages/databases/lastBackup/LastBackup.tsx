import { useDbBackups } from 'hooks/api/backups/useBackups';
import { LastBackupProps } from './LastBackup.types';
import { BackupStatus } from 'shared-types/backups.types';
import { IconButton, Tooltip, Typography } from '@mui/material';
import { Messages } from '../dbClusterView.messages';
import { WarningIcon } from '@percona/ui-lib';
import { getLastBackupTimeDiff } from '../DbClusterView.utils';

export const LastBackup = ({ dbName, namespace }: LastBackupProps) => {
  const { data: backups = [] } = useDbBackups(dbName!, namespace, {
    enabled: !!dbName,
    refetchInterval: 10 * 1000,
  });

  const lastBackup = backups?.pop();
  const lastBackupDate = lastBackup?.created || new Date();

  return (
    <>
      {backups.length ? (
        <Typography>{getLastBackupTimeDiff(lastBackupDate)}</Typography>
      ) : (
        <Typography>{Messages.lastBackup.inactive}</Typography>
      )}

      {lastBackup?.state === BackupStatus.FAILED && (
        <Tooltip title={Messages.lastBackup.warningTooltip} placement="right">
          <IconButton>
            <WarningIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
};
