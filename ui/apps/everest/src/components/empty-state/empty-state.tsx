import { Box, Button, Divider, Typography } from '@mui/material';
import { EmptyStateIcon } from '@percona/ui-lib';
import { ContactSupportLink } from 'pages/common/empty-state/ContactSupportLink';
import { centeredContainerStyle } from 'pages/common/empty-state/utils';

type Props = {
  showCreationButton?: boolean;
  contentSlot?: React.ReactNode;
  buttonText?: string;
};

const EmptyState = ({
  showCreationButton = true,
  contentSlot,
  buttonText,
}: Props) => {
  return (
    <>
      <Box
        sx={{
          ...centeredContainerStyle,
          backgroundColor: (theme) =>
            theme.palette.surfaces?.elevation0 || 'transparent',
          p: 3,
          gap: 2,
        }}
      >
        <EmptyStateIcon w="60px" h="60px" />
        <Box
          sx={{
            ...centeredContainerStyle,
          }}
        >
          {contentSlot ? contentSlot : <Typography>No data to show</Typography>}
        </Box>
        {showCreationButton && (
          <Button variant="contained" onClick={() => {}}>
            {buttonText || 'Create'}
          </Button>
        )}
        <Divider sx={{ width: '30%', marginTop: '10px' }} />
        <ContactSupportLink msg="Contact Percona support" />
      </Box>
    </>
  );
};

export default EmptyState;
