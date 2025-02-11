import { Theme } from '@mui/material';

export const centeredContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};
export const helpIconStyle = (theme: Theme) => {
  return {
    color: theme.palette.background.paper,
    backgroundColor: theme.palette.primary.main,
    borderRadius: '10px',
  };
};
