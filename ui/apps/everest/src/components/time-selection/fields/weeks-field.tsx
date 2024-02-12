import { MenuItem, Typography } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { SelectInput } from '@percona/ui-lib';
import { Messages } from '../time-selection.messages';
import {
  TimeSelectionFields,
  WeekDays,
  weekDaysPlural,
} from '../time-selection.types';

export const WeeksField = () => {
  const { control } = useFormContext();
  return (
    <>
      <Typography variant="sectionHeading">{Messages.on}</Typography>
      <SelectInput
        name={TimeSelectionFields.weekDay}
        control={control}
        selectFieldProps={{
          sx: { minWidth: '120px' },
        }}
        data-testid="weeks-field"
      >
        {Object.values(WeekDays).map((value) => (
          <MenuItem key={value} value={value} data-testid={value}>
            {weekDaysPlural(value)}
          </MenuItem>
        ))}
      </SelectInput>
    </>
  );
};
