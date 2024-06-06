import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Link,
  Typography,
} from '@mui/material';
import { DialogTitle } from '@percona/ui-lib';
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
      PaperProps={{ sx: { minWidth: '800px' } }}
      open={open}
      onClose={closeDialog}
    >
      <DialogTitle onClose={closeDialog}>{Messages.header}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexFlow: 'column' }}>
        <Typography variant="body1" sx={{ marginBottom: 2 }}>
          {Messages.subHead}
          <Link
            href="https://github.com/percona/everest/issues"
            target="_blank"
            rel="noopener"
          >
            {Messages.githubIssues}
          </Link>
          .
        </Typography>
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
      <DialogActions>
        <Button onClick={handleRedirectHome} variant="contained" size="large">
          {Messages.letsGo}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
