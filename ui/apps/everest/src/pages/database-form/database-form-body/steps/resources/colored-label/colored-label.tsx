import { Box, Typography } from '@mui/material';
import { ColoredLabelProps } from './colored-label.types';

export const ColoredLabel = ({
  sxBox,
  sxTypography,
  label,
  bordered,
}: ColoredLabelProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          borderRadius: '50%',
          width: '10px',
          height: '10px',
          mr: 0.5,
          ml: 1.5,
          ...(bordered && { border: '1px solid' }),
          ...sxBox,
        }}
      />
      <Typography
        sx={{
          fontSize: '12px',
          lineHeight: '15px',
          fontWeight: 450,
          ...sxTypography,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};
