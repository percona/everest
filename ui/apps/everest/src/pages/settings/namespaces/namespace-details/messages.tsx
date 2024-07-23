import { Typography } from '@mui/material';

export const Messages = {
  upgradeOperators: 'Upgrade Operators',
  upgradeConfirmation: (namespace: string) => (
    <Typography variant="body1">
      Are you sure you want to upgrade your operators in <b>{namespace}</b>?
    </Typography>
  ),
  upgradeCRVersion: (clusterName: string, newVersion: string) => (
    <Typography variant="body1">
      Are you sure you want to upgrade your CRD (Custom Resource Definition) to
      version {newVersion} in <b>{clusterName}</b> cluster?
    </Typography>
  ),
  upgradeEngineVersion: (clusterName: string, newVersion: string) => (
    <Typography variant="body1">
      Your DB engine will be upgraded to version {newVersion} in{' '}
      <b>{clusterName}</b> cluster.
    </Typography>
  ),
};
