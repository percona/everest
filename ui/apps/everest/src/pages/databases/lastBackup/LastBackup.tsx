import { useDbBackups, useDbClusterPitr } from 'hooks/api/backups/useBackups';
import { LastBackupProps } from './LastBackup.types';
import { IconButton, Tooltip, Typography } from '@mui/material';
import { Messages } from '../dbClusterView.messages';
import { getLastBackupTimeDiff } from '../DbClusterView.utils';
import { WarningIcon } from '@percona/ui-lib';

export const LastBackup = ({ dbName, namespace }: LastBackupProps) => {
  const { data: backups = [] } = useDbBackups(dbName!, namespace, {
    enabled: !!dbName,
    refetchInterval: 10 * 1000,
  });

  const { data: pitrData } = useDbClusterPitr(dbName, namespace);

  const finishedBackups = backups.filter((backup) => backup.completed);
  const lastBackup = finishedBackups[finishedBackups.length - 1];
  const lastBackupDate = lastBackup?.completed || new Date();

  return (
    <>
      {finishedBackups.length ? (
        <>
          <Typography variant="body2">
            {getLastBackupTimeDiff(lastBackupDate)}
          </Typography>
          {pitrData?.gaps && (
            <Tooltip
              title={Messages.lastBackup.warningTooltip}
              placement="right"
              arrow
            >
              <IconButton>
                <WarningIcon />
              </IconButton>
            </Tooltip>
          )}
        </>
      ) : (
        <Typography variant="body2">{Messages.lastBackup.inactive}</Typography>
      )}
    </>
  );
};
