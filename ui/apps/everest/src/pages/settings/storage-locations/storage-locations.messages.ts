export const Messages = {
  createEditModal: {
    addEditModal: (isEditMode: boolean) =>
      `${isEditMode ? 'Edit' : 'Add'} Backup storage`,
    addEditButton: (isEditMode: boolean) => (isEditMode ? 'Edit' : 'Add'),
    cancel: 'Cancel',
    placeholders: {
      name: 'Enter storage display name',
      description: 'Enter an optional description',
      namespaces: 'Select namespaces',
      type: 'Enter bucket name',
      region: 'Enter regions',
      url: 'Enter URL',
      accessKey: 'Enter Access key',
      secretKey: 'Enter Secret key',
    },
    helperText: {
      namespaces:
        'Select in which namespaces this storage should be available.',
    },
  },
  deleteDialog: {
    header: 'Delete storage',
    content: (
      storageName: string
    ) => `Are you sure you want to permanently delete this backup storage "${storageName}"? Any
database clusters using this storage will no longer be able to execute
their scheduled backup jobs.`,
  },
  s3: 'S3 Compatible',
  gcs: 'Google Cloud Storage',
  azure: 'Azure Cloud Storage',
  name: 'Name',
  namespaces: 'Namespaces',
  type: 'Type',
  bucketName: 'Bucket Name',
  description: 'Description',
  region: 'Region',
  url: 'Endpoint',
  accessKey: 'Access Key',
  secretKey: 'Secret Key',
  verifyTLS: 'Verify TLS certificate',
  forcePathStyle: 'Force path-style URL access',
  edit: 'Edit',
  delete: 'Delete',
  addStorageLocationButton: 'Add backup storage',
  noData: "No backup storage set up yet. Let's get started!",
};
