import { Alert } from '@mui/material';
import { Messages } from './tls-alert.messages';
import { TlsAlertProps } from './tls-alert.types';

const TlsAlert = ({ ...props }: TlsAlertProps) => (
  <Alert severity="warning" {...props}>
    {Messages.warning}
  </Alert>
);
export default TlsAlert;
