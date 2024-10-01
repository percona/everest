export const Messages = {
  onDemandBackupModal: {
    subHead:
      'Create an immediate backup of this database, to store a snapshot of its current data.',
    backupName: 'Backup name',
    storageLocation: 'Backup storage',
    backupDetails: 'Backup details',
    headerMessage: 'Create backup now',
    submitMessage: 'Create',
  },
  menuItems: {
    edit: 'Edit',
    delete: 'Delete',
    restart: 'Restart',
    suspend: 'Suspend',
    resume: 'Resume',
    restoreFromBackup: 'Restore from a backup',
    createNewDbFromBackup: 'Create DB from a backup',
    dbStatusDetails: 'View DB status details',
  },
  schedulesBackupModal: {
    subHead:
      'Create a task that regularly backs up this database according to your specified schedule.',
  },
  deleteModal: {
    header: 'Delete database',
    content: (dbName: string) => (
      <>
        Are you sure you want to permanently delete <b>{dbName}</b>? To confirm
        this action, type the name of your database.
      </>
    ),
    databaseName: 'Database name',
    alertMessage:
      'This action will permanently destroy your database and you will not be able to recover it.',
    checkboxMessage: 'Keep backups storage data',
    disabledCheckboxForPGTooltip:
      'Backups storage data is kept for PostgreSQL databases.',
    confirmButtom: 'Delete',
  },
  noStorages: {
    alert:
      'You don’t have any backup storage set yet. Please set one before you proceed.',
    submitButton: 'Go to settings',
    cancel: 'Cancel',
  },

  backups: 'Backups',
  restores: 'Restores',
  overview: 'Overview',
  components: 'Components',
  dbActions: 'Actions',
  restoringDb:
    'We are recovering your database. Do not perform any actions on the database until recovery is complete.',
};
