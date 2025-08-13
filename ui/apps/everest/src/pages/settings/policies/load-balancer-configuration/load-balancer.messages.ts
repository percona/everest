export const messages = {
  title: 'Load Balancer Configuration',
  rowActions: {
    viewDetails: 'View details',
    delete: 'Delete',
  },
  deleteDialog: {
    alertMessage: {
      inUse:
        'This config is currently in use by one or more clusters. Please unassign it first before deleting.',
      notInUse:
        'This action will permanently delete your config and affect all the clusters using it.',
    },
    dialogContent: {
      firstPart: 'Are you sure you want to permanently delete ',
      secondPart:
        ' config? To confirm this action, type the name of your config.',
    },
  },
  configurationList: {
    emptyState: {
      contentSlot: 'You currently do not have any config',
    },
    createButton: 'Create configuration',
  },
};
