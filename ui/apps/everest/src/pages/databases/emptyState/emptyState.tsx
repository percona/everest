import { Box, Button, Divider, Link, Typography } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import AddIcon from '@mui/icons-material/Add';
import { EmptyStateIcon } from '@percona/ui-lib';
import { Link as MUILink } from 'react-router-dom';
import { Messages } from './emptyState.messages';

const centeredContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export const EmptyState = () => {
  return (
    <>
      <Box
        sx={{
          ...centeredContainerStyle,
          marginTop: '50px',
          gap: '10px',
        }}
      >
        <EmptyStateIcon w="60px" h="60px" />
        <Box sx={centeredContainerStyle}>
          <Typography>{Messages.noDbClusters}</Typography>
          <Typography> {Messages.createToStart}</Typography>
        </Box>

        <Button // TODO refactor with new component when #811 is merged
          size="small"
          startIcon={<AddIcon />}
          component={MUILink}
          to="/databases/new"
          variant="contained"
          data-testid="add-db-cluster-button"
        >
          {Messages.create}
        </Button>
        <Divider sx={{ width: '30%', marginTop: '10px' }} />
        <Link target="_blank" rel="noopener" href="https://hubs.ly/Q02Rt6pG0">
          <Button startIcon={<HelpIcon />}> {Messages.contactSupport}</Button>
        </Link>
      </Box>
    </>
  );
};
