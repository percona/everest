import { Box, Theme, SxProps } from '@mui/material';
import { ReactNode } from 'react';

export const ExpandedRowInfoLine = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | ReactNode;
  sx?: SxProps<Theme>;
}) => {
  return value?.toString().length ? (
    <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
      <Box
        sx={{ minWidth: '140px', fontWeight: 'bold', alignSelf: 'flex-start' }}
      >
        {label}
      </Box>
      <Box sx={{ minWidth: '200px' }}>{value}</Box>
    </Box>
  ) : null;
};
