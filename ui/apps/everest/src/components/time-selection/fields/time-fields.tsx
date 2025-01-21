import { Box, MenuItem, Typography } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { SelectInput } from '@percona/ui-lib';
import { HOURS_AM_PM, MINUTES } from '../time-selection.constants';
import { Messages } from '../time-selection.messages';
import { AmPM, TimeSelectionFields } from '../time-selection.types';
import { addZeroToSingleDigit } from '../time-selection.utils';

export const TimeFields = ({
  selectableHours = HOURS_AM_PM,
  selectableMinutes = MINUTES,
}: {
  selectableHours?: number[];
  selectableMinutes?: number[];
}) => {
  const { control } = useFormContext();

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        [theme.breakpoints.down('sm')]: {
          flexBasis: '100%',
        },
      })}
    >
      <Typography variant="sectionHeading">{Messages.at}</Typography>
      <SelectInput
        name={TimeSelectionFields.hour}
        control={control}
        selectFieldProps={{
          sx: { minWidth: '80px' },
        }}
      >
        {HOURS_AM_PM.map((value) => (
          <MenuItem
            key={value}
            value={value}
            sx={{ display: selectableHours.includes(value) ? 'block' : 'none' }}
          >
            {value}
          </MenuItem>
        ))}
      </SelectInput>
      <SelectInput
        name={TimeSelectionFields.minute}
        control={control}
        selectFieldProps={{
          sx: { minWidth: '80px' },
        }}
      >
        {MINUTES.map((value) => (
          <MenuItem
            key={value}
            value={value}
            sx={{
              display: selectableMinutes.includes(value) ? 'block' : 'none',
            }}
          >
            {addZeroToSingleDigit(value)}
          </MenuItem>
        ))}
      </SelectInput>
      <SelectInput
        name={TimeSelectionFields.amPm}
        control={control}
        selectFieldProps={{
          sx: { minWidth: '80px' },
        }}
      >
        <MenuItem value={AmPM.AM}>{Messages.am}</MenuItem>
        <MenuItem value={AmPM.PM}>{Messages.pm}</MenuItem>
      </SelectInput>
    </Box>
  );
};
