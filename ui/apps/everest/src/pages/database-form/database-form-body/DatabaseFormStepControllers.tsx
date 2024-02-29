import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Messages } from '../database-form.messages';
import { DatabaseFormStepControllersProps } from './types';

const DatabaseFormStepControllers = ({
  disableBack,
  disableNext,
  disableSubmit,
  showSubmit,
  editMode,
  onPreviousClick,
  onNextClick,
  onCancel,
  onSubmit,
}: DatabaseFormStepControllersProps) => (
  <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4 }}>
    <Button
      type="button"
      startIcon={<ArrowBackIcon />}
      variant="text"
      disabled={disableBack}
      onClick={onPreviousClick}
      sx={{ mr: 1 }}
      data-testid="db-wizard-previous-button"
    >
      {Messages.previous}
    </Button>
    <Box sx={{ flex: '1 1 auto' }} />
    <Button
      variant="outlined"
      disabled={disableSubmit}
      data-testid="db-wizard-cancel-button"
      sx={{ mr: 1 }}
      onClick={onCancel}
    >
      {Messages.cancel}
    </Button>
    {showSubmit ? (
      <Button
        onClick={onSubmit}
        variant="contained"
        disabled={disableSubmit}
        data-testid="db-wizard-submit-button"
      >
        {editMode ? Messages.editDatabase : Messages.createDatabase}
      </Button>
    ) : (
      <Button
        onClick={onNextClick}
        variant="contained"
        data-testid="db-wizard-continue-button"
        disabled={disableNext}
      >
        {Messages.continue}
      </Button>
    )}
  </Box>
);

export default DatabaseFormStepControllers;
