import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { EmptyStateIcon } from '@percona/ui-lib';
import { Messages } from './messages';
import { ArrowOutward } from '@mui/icons-material';
import { centeredContainerStyle } from '../utils';
import { ContactSupportLink } from '../ContactSupportLink';
import { CodeCopyBlock } from 'components/code-copy-block/code-copy-block';

const CommandInstructions = ({
  message,
  command,
}: {
  message: string;
  command: string;
}) => (
  <Stack mt={3} maxWidth="350px">
    <Typography variant="body2">{message}</Typography>
    <CodeCopyBlock message={command} />
  </Stack>
);

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
          <CommandInstructions
            message="If you are using CLI, run the following command:"
            command="everestctl namespaces add <NAMESPACE>"
          />
          <CommandInstructions
            message="If you are using Helm, run the following command:"
            command="helm install everest percona/everest-db-namespace --create-namespace --namespace <NAMESPACE>"
          />
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
