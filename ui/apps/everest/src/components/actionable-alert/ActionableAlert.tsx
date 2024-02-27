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
    action={
      <Button color="inherit" size="small" onClick={onClick} {...buttonProps}>
        {buttonMessage || 'Add'}
      </Button>
    }
    {...alertProps}
  >
    {message}
  </Alert>
);
export default ActionableAlert;
