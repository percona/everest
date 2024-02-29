import { Stack, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Messages } from './ConfirmationScreen.messages';
import { useDatabasePageMode } from '../../../useDatabasePageMode';

const ConfirmationScreen = () => {
  const mode = useDatabasePageMode();

  return (
    <Stack alignItems="center">
      <Stack direction="row" alignItems="center">
        <CheckCircleOutlineIcon
          sx={{ color: 'success.contrastText', fontSize: 64, mr: 1 }}
        />
        <Stack direction="column">
          <Typography variant="h6">
            {mode === 'new' ? Messages.dbBeingCreated : Messages.dbBeingUpdated}
          </Typography>
          {mode === 'new' && (
            <Typography variant="caption">{Messages.sitTight}</Typography>
          )}
        </Stack>
      </Stack>
      <Button
        variant="outlined"
        component={Link}
        to="/databases"
        size="small"
        sx={{ mt: 4 }}
        data-testid="db-wizard-goto-db-clusters"
      >
        {Messages.goToList}
      </Button>
    </Stack>
  );
};

export default ConfirmationScreen;
