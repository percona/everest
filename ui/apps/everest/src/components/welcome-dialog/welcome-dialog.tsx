import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from '@mui/material';
import { EverestMainIcon } from '@percona/ui-lib';
import { useNavigate } from 'react-router-dom';
import { Messages } from './welcome-dialog.messages';

export const WelcomeDialog = ({
  open,
  closeDialog,
}: {
  open: boolean;
  closeDialog: () => void;
}) => {
  const navigate = useNavigate();

  const handleRedirectHome = () => {
    navigate('/');
    closeDialog();
  };

  return (
    <Dialog
      PaperProps={{ sx: { px: 4, pt: 4 } }}
      open={open}
      onClose={closeDialog}
    >
      <DialogContent sx={{ display: 'flex', flexFlow: 'column' }}>
        <Stack alignItems="center">
          <EverestMainIcon sx={{ fontSize: '100px', mb: 2 }} />
          <Typography variant="h2">{Messages.allSet}</Typography>
          <Typography variant="h6" textAlign="center">
            {Messages.start}
          </Typography>
        </Stack>
        {/* TODO: uncomment when default settings page is ready */}
        {/* <Divider />
        <Typography variant="subHead1" sx={{ p: '24px 44px 8px 44px' }}>
          {Messages.subHead2}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            px: '44px',
          }}
        >
          <CardLink
            Icon={AddCircleOutlineIcon}
            action={Messages.card1.header}
            description={Messages.card1.description}
            link="/databases/new"
            handleCloseModal={closeDialog}
          />
          <CardLink
            Icon={SettingsOutlinedIcon}
            action={Messages.card2.header}
            description={Messages.card2.description}
            link="/settings"
            handleCloseModal={closeDialog}
          />
        </Box> */}
      </DialogContent>
      {/* TODO: remove dialog actions when cards are uncommented */}
      <DialogActions sx={{ mt: 4 }}>
        <Button onClick={handleRedirectHome} variant="contained" size="large">
          {Messages.letsGo}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
