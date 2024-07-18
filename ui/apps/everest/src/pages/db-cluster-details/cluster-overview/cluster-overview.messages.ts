export const Messages = {
  titles: {
    dbDetails: 'DB Details',
    basicInformation: 'Basic Information',
    connectionDetails: 'Connection Details',
    monitoring: 'Monitoring',
    advancedConfiguration: 'Advanced configuration',
  },
  fields: {
    // monitoring: (name: string) => `Name: ${name}`,
    // pitr: (isEnabled: string) =>
    //   `${Messages.titles.pitr} ${isEnabled.toLocaleLowerCase()}`,
    type: 'Type',
    name: 'Name',
    namespace: 'Namespace',
    version: 'Version',
    host: 'Host',
    port: 'Port',
    username: 'Username',
    password: 'Password',
    status: 'Status',
    externalAccess: 'Ext.access',
    parameters: 'Parameters',
    enabled: `Enabled`,
    disabled: `Disabled`,
  },
};
