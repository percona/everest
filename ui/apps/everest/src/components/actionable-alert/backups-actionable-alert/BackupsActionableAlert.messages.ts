export const Messages = {
  noStoragesMessage: (namespace: string) =>
    `To enable scheduled backups for the ${namespace} namespace, first add a backup storage within the same namespace. If you want to proceed without the scheduled backups, disable them.`,
  addStorage: 'Add storage',
};
