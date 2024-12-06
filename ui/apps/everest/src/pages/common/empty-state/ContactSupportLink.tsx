import { useTheme } from '@mui/material';
import { Button, Link } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import { helpIconStyle } from './utils';

export const ContactSupportLink = ({ msg }: { msg: string }) => {
  const theme = useTheme();
  return (
    <Link target="_blank" rel="noopener" href="https://hubs.ly/Q02Rt6pG0">
      <Button startIcon={<HelpIcon sx={helpIconStyle(theme)} />}>{msg}</Button>
    </Link>
  );
};
