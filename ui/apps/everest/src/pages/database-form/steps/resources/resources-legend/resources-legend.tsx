import { Box, useTheme } from '@mui/material';
import { ColoredLabel } from '../colored-label/colored-label';
import { Messages } from './resources-legend.messages';

export const ResourcesLegend = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'flex-end' }}
      data-testid="resources-legend"
    >
      <ColoredLabel
        label={Messages.consumed}
        sxBox={{ backgroundColor: 'primary.main' }}
      />
      <ColoredLabel
        label={Messages.required}
        bordered
        sxBox={{ borderColor: theme.palette.action.disabled }}
      />
      <ColoredLabel
        label={Messages.available}
        sxBox={{ backgroundColor: theme.palette.action.focus }}
      />
    </Box>
  );
};
