import {
  Button,
  Divider,
  Typography,
  Link,
  useTheme,
  Stack,
} from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import { EmptyStateIcon } from '@percona/ui-lib';

const ContactSupportLink = ({ msg }: { msg: string }) => {
  const theme = useTheme();
  return (
    <Link target="_blank" rel="noopener" href="https://hubs.ly/Q02YRLsL0">
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
        {msg}
      </Button>
    </Link>
  );
};

type EmptyStateProps = {
  showCreationButton?: boolean;
  contentSlot?: React.ReactNode;
  buttonSlot?: React.ReactNode;
  buttonText?: string;
  onButtonClick?: () => void;
};

const EmptyState = ({
  showCreationButton = true,
  contentSlot,
  buttonSlot,
  buttonText,
  onButtonClick = () => {},
}: EmptyStateProps) => {
  return (
    <>
      <Stack
        alignItems="center"
        sx={{
          flexDirection: 'column',
          backgroundColor: (theme) =>
            theme.palette.surfaces?.elevation0 || 'transparent',
          p: 3,
          gap: 2,
        }}
      >
        <EmptyStateIcon w="60px" h="60px" />
        <Stack alignItems="center">
          {contentSlot ? contentSlot : <Typography>No data to show</Typography>}
        </Stack>
        {buttonSlot
          ? buttonSlot
          : showCreationButton && (
              <Button variant="contained" onClick={onButtonClick}>
                {buttonText || 'Create'}
              </Button>
            )}

        <Divider sx={{ width: '30%', marginTop: '10px' }} />
        <ContactSupportLink msg="Contact Percona support" />
      </Stack>
    </>
  );
};

export default EmptyState;
