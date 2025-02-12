import { Box, BoxProps } from '@mui/material';

const RoundedBox = ({ sx, children, ...rest }: BoxProps) => (
  <Box
    className="percona-rounded-box"
    sx={{
      p: 2,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: (theme) => theme.palette.divider,
      borderRadius: '8px',
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Box>
);

export default RoundedBox;
