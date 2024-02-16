import { MenuItem, Typography } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { SelectInput } from '@percona/ui-lib';
import { DAYS_MONTH } from '../time-selection.constants';
import { Messages } from '../time-selection.messages';
import { TimeSelectionFields } from '../time-selection.types';

export const MonthsField = () => {
  const { control } = useFormContext();
  return (
    <>
      <Typography variant="sectionHeading">{Messages.onDay}</Typography>
      <SelectInput
        name={TimeSelectionFields.onDay}
        control={control}
        selectFieldProps={{
          sx: { minWidth: '80px' },
        }}
        data-testid="select-field"
      >
        {DAYS_MONTH.map((value) => (
          <MenuItem key={value} value={value} data-testid={value}>
            {value}
          </MenuItem>
        ))}
      </SelectInput>
    </>
  );
};
