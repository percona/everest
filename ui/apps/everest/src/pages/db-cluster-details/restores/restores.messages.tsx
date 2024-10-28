export const Messages = {
  deleteDialog: {
    header: 'Delete restore',
    content: (restoreName: string) => (
      <>
        Are you sure you want to permanently delete <b>{restoreName}</b>?
      </>
    ),
  },
};
