import { IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { BackNavigationTextProps } from './back-nativation-text.types';

const BackNavigationText = ({
  text,
  onBackClick,
  stackProps,
}: BackNavigationTextProps) => (
  <Stack gap={1} alignItems="center" flexDirection="row" {...stackProps}>
    <IconButton onClick={onBackClick}>
      <ArrowBackIosIcon sx={{ pl: '10px' }} fontSize="large" />
    </IconButton>
    <Typography variant="h4">{text}</Typography>
  </Stack>
);

export default BackNavigationText;
