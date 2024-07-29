import { Alert, Button } from '@mui/material';
import { ActionableAlertProps } from './ActionableAlert.types';

const ActionableAlert = ({
  message,
  onClick,
  buttonMessage,
  buttonProps,
  ...alertProps
}: ActionableAlertProps) => (
  <Alert
    severity="warning"
    sx={{
      '& .MuiAlert-action': {
        alignItems: 'center',
        pt: 0,
      },
    }}
    action={
      <Button
        sx={{ color: 'warning.contrastText', fontWeight: 600 }}
        size="small"
        onClick={onClick}
        {...buttonProps}
      >
        {buttonMessage || 'Add'}
      </Button>
    }
    {...alertProps}
  >
    {message}
  </Alert>
);
export default ActionableAlert;
