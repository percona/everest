export const Messages = {
  now: 'Now',
  schedule: 'Schedule',
  deleteModal: {
    header: 'Delete schedule',
    content: (scheduleName: string) => (
      <>
        Are you sure you want to permanently delete schedule{' '}
        <b>{scheduleName}</b>?
      </>
    ),
  },
  maximumPgSchedules: 'Note: Maximum 3 schedules for PostgreSQL',
  activeSchedules: (schedulesNumber: number) =>
    `${schedulesNumber} active schedule${schedulesNumber > 1 ? 's' : ''}`,
  exceededScheduleBackupsNumber:
    'Maximum limit of schedules for PostgreSQL reached.',
};
