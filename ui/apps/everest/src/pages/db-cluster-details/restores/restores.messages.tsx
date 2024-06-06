export const Messages = {
  pitrError: `PITR can experience issues resulting from gaps, which may occur due to reasons such as disabling and then enabling PITR or technical issues like data loss.
              To ensure proper functioning of PITR, you need to take an additional full backup.
              `,
  deleteDialog: {
    header: 'Delete restore',
    content: (restoreName: string) => (
      <>
        Are you sure you want to permanently delete <b>{restoreName}</b>?
      </>
    ),
  },
};
