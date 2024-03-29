export const Messages = {
  add: 'Add endpoint',
  edit: 'Edit',
  delete: 'Delete',
  deleteDialogHeader: 'Delete monitoring endpoint',
  addEditDialogHeader: (editMode: boolean) =>
    `${editMode ? 'Edit' : 'Add'} monitoring endpoint`,
  addEditDialogSubmitButton: (editMode: boolean) =>
    `${editMode ? 'Edit' : 'Add'}`,
  deleteConfirmation: (endpoint: string) =>
    `Are you sure you want to permanently delete endpoint "${endpoint}"?`,
  fieldLabels: {
    name: 'Name',
    namespaces: 'Namespaces',
    endpoint: 'Endpoint',
    user: 'User',
    password: 'Password',
    apiKey: 'API Key',
    verifyTLS: 'Verify TLS certificate',
  },
  namespaces: 'Namespaces',
  helperText: {
    namespaces: 'Select in which namespaces this endpoint should be available.',
    credentials:
      'Percona Everest does not store PMM credentials, so fill in both the User and Password fields.',
  },
};
