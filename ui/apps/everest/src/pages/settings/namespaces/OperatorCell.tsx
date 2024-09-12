import { Button, Stack, Typography } from '@mui/material';
import { useRBACPermissions } from 'hooks/rbac/rbac';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export const OperatorCell = ({
  value,
  namespace,
  upgradeAvailable,
  operators,
}: {
  value: string;
  namespace: string;
  operators: string[];
  upgradeAvailable: boolean;
}) => {
  const operatorsToCheck = useMemo(
    () => operators.map((operator) => `${namespace}/${operator}`),
    [namespace, operators]
  );
  const { canUpdate, canRead } = useRBACPermissions(
    'database-engines',
    operatorsToCheck
  );
  const navigate = useNavigate();
  const permissionGranted = canUpdate && canRead && !!operators.length;

  return (
    <Stack direction="row" alignItems="center" width="100%">
      <Typography variant="body1">{value}</Typography>
      {upgradeAvailable && permissionGranted && (
        <Button
          onClick={() => navigate(`/settings/namespaces/${namespace}`)}
          sx={{ ml: 'auto' }}
        >
          Upgrade
        </Button>
      )}
    </Stack>
  );
};
