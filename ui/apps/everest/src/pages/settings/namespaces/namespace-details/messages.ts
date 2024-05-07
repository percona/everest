export const Messages = {
  upgradingOperator: 'Upgrading the operator...',
  upgradeOperator: 'Upgrade Operator',
  upgradeConfirmation: (
    dbType: string,
    namespace: string,
    newVersion: string
  ) =>
    `Are you sure you want to upgrade ${dbType} operator in namespace ${namespace} to version ${newVersion}?`,
};
