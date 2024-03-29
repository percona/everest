import { useDbBackups } from 'hooks/api/backups/useBackups';
import { LastBackupProps } from './LastBackup.types';
import { Typography } from '@mui/material';
import { Messages } from '../dbClusterView.messages';
import { getLastBackupTimeDiff } from '../DbClusterView.utils';

export const LastBackup = ({ dbName, namespace }: LastBackupProps) => {
  const { data: backups = [] } = useDbBackups(dbName!, namespace, {
    enabled: !!dbName,
    refetchInterval: 10 * 1000,
  });

  const lastBackup = backups[backups.length - 1];
  const lastBackupDate = lastBackup?.created || new Date();

  return (
    <>
      {backups.length ? (
        <Typography>{getLastBackupTimeDiff(lastBackupDate)}</Typography>
      ) : (
        <Typography>{Messages.lastBackup.inactive}</Typography>
      )}
    </>
  );
};
