import { Box, Button, Typography } from '@mui/material';
import { UpgradeHeaderProps } from './types';

const UpgradeHeader = ({ status }: UpgradeHeaderProps) => (
  <Box display="flex" justifyContent="space-between" alignItems="center">
    <Typography variant="body1">
      Finalize upgrading MySQL Operator to version x.x.x by completing all
      outstanding tasks in the Actions column.
    </Typography>
    {status !== 'no-upgrade' && (
      <Button size="medium" variant="contained">
        Upgrade Operator
      </Button>
    )}
  </Box>
);

export default UpgradeHeader;
