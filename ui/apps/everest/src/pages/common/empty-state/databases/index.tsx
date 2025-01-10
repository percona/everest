import { Box, Divider, Typography } from '@mui/material';
import { EmptyStateIcon } from '@percona/ui-lib';
import { Messages } from './messages';
import CreateDbButton from 'pages/databases/create-db-button/create-db-button';
import { centeredContainerStyle } from '../utils';
import { ContactSupportLink } from '../ContactSupportLink';

export const EmptyStateDatabases = ({
  showCreationButton,
}: {
  showCreationButton: boolean;
}) => {
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
        {showCreationButton && <CreateDbButton />}
        <Divider sx={{ width: '30%', marginTop: '10px' }} />
        <ContactSupportLink msg={Messages.contactSupport} />
      </Box>
    </>
  );
};
