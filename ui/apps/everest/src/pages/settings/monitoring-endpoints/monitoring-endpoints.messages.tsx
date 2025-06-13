export const Messages = {
  add: 'Add monitoring endpoint',
  edit: 'Edit',
  delete: 'Delete',
  deleteDialogHeader: 'Delete monitoring endpoint',
  addEditDialogHeader: (editMode: boolean) =>
    `${editMode ? 'Edit' : 'Add'} monitoring endpoint`,
  addEditDialogSubmitButton: (editMode: boolean) => (editMode ? 'Save' : 'Add'),
  deleteConfirmation: (endpoint: string) => (
    <>
      Are you sure you want to permanently delete monitoring endpoint{' '}
      <b>{endpoint}</b>?
    </>
  ),
  columns: {
    name: 'Name',
    url: 'Endpoint',
    cluster: 'Cluster',
    namespace: 'Namespace',
  },
  fieldLabels: {
    name: 'Name',
    namespace: 'Namespace',
    endpoint: 'Endpoint',
    user: 'User',
    password: 'Password',
    apiKey: 'API Key',
  },
  namespaces: 'Namespaces',
  helperText: {
    credentials:
      'Percona Everest does not store PMM credentials, so fill in both the User and Password fields.',
  },
  fieldPlaceholders: {
    name: 'Insert Monitoring endpoint display name',
    namespaces: 'Select namespace',
    endpoint: 'Enter endpoint URL',
    user: 'Enter username',
    password: 'Enter password',
  },
};
