import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useGetPermissions } from 'utils/useGetPermissions';

export const OperatorCell = ({
  value,
  namespace,
  upgradeAvailable,
}: {
  value: string;
  namespace: string;
  upgradeAvailable: boolean;
}) => {
  const { canUpdate } = useGetPermissions({
    resource: 'database-engines',
    namespace: namespace,
  });
  const navigate = useNavigate();

  return (
    <Stack direction="row" alignItems="center" width="100%">
      <Typography variant="body1">{value}</Typography>
      {upgradeAvailable && canUpdate && (
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
