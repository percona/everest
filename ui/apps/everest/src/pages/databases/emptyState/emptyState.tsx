import {
  Box,
  Button,
  Divider,
  Link,
  Typography,
  useTheme,
} from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import { EmptyStateIcon } from '@percona/ui-lib';
import { Messages } from './emptyState.messages';
import CreateDbButton from '../create-db-button/create-db-button';

const centeredContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export const EmptyState = () => {
  const theme = useTheme();
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
        {/* // TODO refactor with new component when #811 is merged*/}
        <CreateDbButton />
        <Divider sx={{ width: '30%', marginTop: '10px' }} />
        <Link target="_blank" rel="noopener" href="https://hubs.ly/Q02Rt6pG0">
          <Button
            startIcon={
              <HelpIcon
                sx={{
                  color: theme.palette.background.paper,
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: '10px',
                }}
              />
            }
          >
            {Messages.contactSupport}
          </Button>
        </Link>
      </Box>
    </>
  );
};
