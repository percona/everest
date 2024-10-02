import { Button, Stack, Typography } from '@mui/material';
import { useRBACPermissions } from 'hooks/rbac';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NamespaceInstance } from 'shared-types/namespaces.types';

export const OperatorCell = ({
  description,
  namespaceInstance: { name, operators, upgradeAvailable, pendingActions },
}: {
  description: string;
  namespaceInstance: NamespaceInstance;
}) => {
  const operatorsToCheck = useMemo(
    () => operators.map((operator) => `${name}/${operator}`),
    [name, operators]
  );
  const { canUpdate, canRead } = useRBACPermissions(
    'database-engines',
    operatorsToCheck
  );
  const navigate = useNavigate();

  return (
    <Stack direction="row" alignItems="center" width="100%">
      <Typography variant="body1">{description}</Typography>
      {(upgradeAvailable || pendingActions.length) && canRead && (
        <Button
          onClick={() => navigate(`/settings/namespaces/${name}`)}
          disabled={!canUpdate}
          sx={{ ml: 'auto' }}
        >
          Upgrade
        </Button>
      )}
    </Stack>
  );
};
