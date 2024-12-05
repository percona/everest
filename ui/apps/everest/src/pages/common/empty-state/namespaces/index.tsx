import { Box, Button, Divider, Typography } from '@mui/material';
import { EmptyStateIcon } from '@percona/ui-lib';
import { Messages } from './messages';
import { ArrowOutward } from '@mui/icons-material';
import { centeredContainerStyle } from '../utils';
import { ContactSupportLink } from '../ContactSupportLink';

export const EmptyStateNamespaces = () => {
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
          <Typography>{Messages.noNamespaces}</Typography>
          <Typography> {Messages.createToStart}</Typography>
          <Typography> {Messages.command}</Typography>
        </Box>
        <Button
          data-testid="learn-more-button"
          size="small"
          variant="contained"
          sx={{ display: 'flex' }}
          onClick={() => {
            window.open(
              'https://docs.percona.com/everest/administer/manage_namespaces.html',
              '_blank',
              'noopener'
            );
          }}
          endIcon={<ArrowOutward />}
        >
          {Messages.learnMore}
        </Button>
        <Divider sx={{ width: '30%', marginTop: '10px' }} />
        <ContactSupportLink msg={Messages.contactSupport} />
      </Box>
    </>
  );
};
