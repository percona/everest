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

  const lastBackup = backups[backups.length - 1];
  const lastBackupDate = lastBackup?.created || new Date();

  return (
    <>
      {backups.length ? (
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
        <Typography>{Messages.lastBackup.inactive}</Typography>
      )}
    </>
  );
};
