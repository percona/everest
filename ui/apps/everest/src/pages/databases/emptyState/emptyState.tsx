import { Box, Button, Divider, Link, Typography } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import AddIcon from '@mui/icons-material/Add';
import { EmptyStateIcon } from '@percona/ui-lib';
import { Link as MUILink } from 'react-router-dom';

export const EmptyState = () => {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '50px',
          gap: '10px',
        }}
      >
        <EmptyStateIcon w="60px" h="60px" />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography>
            You currently do not have any database cluster.
          </Typography>
          <Typography> Create one to get started.</Typography>
        </Box>

        <Button // TODO refactor with new component when #811 is merged
          size="small"
          startIcon={<AddIcon />}
          component={MUILink}
          to="/databases/new"
          variant="contained"
          data-testid="add-db-cluster-button"
        >
          Create Database
        </Button>
        <Divider sx={{ width: '30%', marginTop: '10px' }} />
        <Link target="_blank" rel="noopener" href="https://hubs.ly/Q02Rt6pG0">
          <Button startIcon={<HelpIcon />}> Contact Percona Support</Button>
        </Link>
      </Box>
    </>
  );
};
