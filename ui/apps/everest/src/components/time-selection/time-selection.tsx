import { Alert, Box, MenuItem } from '@mui/material';
import { SelectInput } from '@percona/ui-lib';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { HoursField } from './fields/hours-field';
import { MonthsField } from './fields/months-field';
import { TimeFields } from './fields/time-fields';
import { WeeksField } from './fields/weeks-field';
import { Messages } from './time-selection.messages';
import {
  TimeSelectionFields,
  TimeSelectionProps,
  TimeValue,
  timeValueHumanized,
} from './time-selection.types';
import { getTimeText } from './time-selection.utils';

export const TimeSelection = ({
  errorInfoAlert,
  showInfoAlert,
  sx,
  sxTimeFields,
}: TimeSelectionProps) => {
  const { watch } = useFormContext();
  const selectedTime: TimeValue = watch(TimeSelectionFields.selectedTime);
  const minute: number = watch(TimeSelectionFields.minute);
  const hour: number = watch(TimeSelectionFields.hour);
  const amPm: string = watch(TimeSelectionFields.amPm);
  const weekDay: string = watch(TimeSelectionFields.weekDay);
  const onDay: number = watch(TimeSelectionFields.onDay);

  const timeInfoText = useMemo(
    () =>
      showInfoAlert
        ? getTimeText(selectedTime, hour, minute, amPm, weekDay, onDay)
        : '',
    [selectedTime, hour, minute, amPm, weekDay, onDay, showInfoAlert]
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        mt: 1,
        '& .MuiFormControl-root': {
          mt: 0,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 2,
          ...sx,
        }}
      >
        <SelectInput
          name="selectedTime"
          selectFieldProps={{
            sx: { minWidth: '120px' },
          }}
        >
          {Object.values(TimeValue).map((value) => (
            <MenuItem key={value} value={value} data-testid={`${value}-option`}>
              {timeValueHumanized[value]}
            </MenuItem>
          ))}
        </SelectInput>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            ...sxTimeFields,
          }}
        >
          {selectedTime === TimeValue.hours && <HoursField />}
          {selectedTime === TimeValue.weeks && <WeeksField />}
          {selectedTime === TimeValue.months && <MonthsField />}
          {(selectedTime === TimeValue.days ||
            selectedTime === TimeValue.weeks ||
            selectedTime === TimeValue.months) && <TimeFields />}
        </Box>
      </Box>
      {errorInfoAlert}
      {showInfoAlert && (
        <Alert severity="info">{Messages.infoText(timeInfoText)}</Alert>
      )}
    </Box>
  );
};
