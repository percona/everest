export const Messages = {
  subHead:
    'Specify how you want to restore this database. Restoring will replace the current database instance with data from the selected snapshot.',
  subHeadCreate:
    "Specify the source for this new database. This will create a standalone database replica that mirrors the database's state at the time of the backup.",
  headerMessage: 'Restore database',
  headerMessageCreate: 'Create database',
  restore: 'Restore',
  fromBackup: 'From a backup',
  fromPitr: 'From a Point-in-time (PITR)',
  selectBackup: 'Select backup (Backup name - Started time)',
  create: 'Create',
  pitrDisclaimer: (earliestDate: string, latestDate: string) =>
    `Restore your database by rolling it back to any date and time between the latest full backup (${earliestDate})
     and the most recent upload of transaction logs (${latestDate})`,
  gapDisclaimer: `Oops, your PITR data contains binlog gaps, which makes PITR currently unavailable for this database.
    To ensure complete PITR points for future restores, start a full backup now.`,
};
