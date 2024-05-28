import { Typography } from '@mui/material';

export const Messages = {
  upgradingOperator: 'Upgrading the operator...',
  upgradeOperator: 'Upgrade Operator',
  upgradeConfirmation: (
    dbType: string,
    namespace: string,
    newVersion: string
  ) =>
    `Are you sure you want to upgrade ${dbType} operator in namespace ${namespace} to version ${newVersion}?`,
  upgradeCRVersion: (clusterName: string, newVersion: string) => (
    <Typography variant="body1">
      Are you sure you want to upgrade your CRD (Custom Resource Definition) to
      version {newVersion} in <b>{clusterName}</b> cluster?
    </Typography>
  ),
};
