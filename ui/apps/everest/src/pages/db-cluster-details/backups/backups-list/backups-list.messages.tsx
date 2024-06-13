import { DbEngineType } from '@percona/types';

export const Messages = {
  deleteDialog: {
    header: 'Delete backup',
    content: (backupName: string, dbType: DbEngineType) => (
      <>
        {dbType === DbEngineType.POSTGRESQL ? (
          <>
            Are you sure you want to permanently delete <b>{backupName}</b>{' '}
            backup? The backup data will not be deleted from the backup storage.
          </>
        ) : (
          <>
            Are you sure you want to permanently delete <b>{backupName}</b>{' '}
            backup?
          </>
        )}
      </>
    ),
    alertMessage:
      'This action will permanently destroy your backup and you will not be able to recover it.',
    confirmButton: 'Delete',
    checkboxMessage: 'Delete backups storage data',
  },
  restoreDialog: {
    header: 'Restore to this database',
    content:
      'Are you sure you want to restore the selected backup? This will update your database to the selected instance.',
    submitButton: 'Restore',
  },
  restoreDialogToNewDb: {
    header: 'Create database from backup',
    content:
      'Are you sure you want to replicate the selected database? This will create an exact copy of the current instance.',
    submitButton: 'Create',
  },
  noData: "You don't have any backups yet. Create one to get started.",
  createBackup: 'Create backup',
  now: 'Now',
  schedule: 'Schedule',
  delete: 'Delete',
  restore: 'Restore to this DB',
  restoreToNewDb: 'Create new DB',
};
