import { Alert, Box, MenuItem } from '@mui/material';
import { SelectInput } from '@percona/ui-lib';
import { useMemo, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { HoursField } from './fields/hours-field';
import { MonthsField } from './fields/months-field';
import { TimeFields } from './fields/time-fields';
import { WeeksField } from './fields/weeks-field';
import { Messages } from './time-selection.messages';
import {
  AmPM,
  TimeSelectionFields,
  TimeSelectionProps,
  TimeValue,
  timeValueHumanized,
} from './time-selection.types';
import { getTimeText } from './time-selection.utils';
import { HOURS_AM_PM, MINUTES } from './time-selection.constants';

export const TimeSelection = ({
  errorInfoAlert,
  showInfoAlert,
  sx,
  sxTimeFields,
  shouldRestrictSelectableHours = false,
  editMode = false,
}: TimeSelectionProps) => {
  const { watch, setValue, getFieldState, resetField } = useFormContext();

  const selectedTime: TimeValue = watch(TimeSelectionFields.selectedTime);
  const minute: number = watch(TimeSelectionFields.minute);
  const hour: number = watch(TimeSelectionFields.hour);
  const amPm: string = watch(TimeSelectionFields.amPm);
  const weekDay: string = watch(TimeSelectionFields.weekDay);
  const onDay: number = watch(TimeSelectionFields.onDay);

  const OFFSET = -1 * (new Date().getTimezoneOffset() / 60);

  const TIMEZONE_OFFSET_HOURS = Math.floor(OFFSET);

  const TIMEZONE_OFFSET_MINUTES = (OFFSET - TIMEZONE_OFFSET_HOURS) * 60;

  const isFirstDayOfTheMonthAndPositiveOffset =
    selectedTime === TimeValue.months &&
    onDay === 1 &&
    TIMEZONE_OFFSET_HOURS > 0;

  const changeSelectableTime =
    shouldRestrictSelectableHours && isFirstDayOfTheMonthAndPositiveOffset;

  const FIRST_HOUR_AVAILABLE =
    TIMEZONE_OFFSET_HOURS < 12
      ? TIMEZONE_OFFSET_HOURS
      : TIMEZONE_OFFSET_HOURS - 12;

  const selectableHours = changeSelectableTime
    ? Array.from(
        { length: 12 - FIRST_HOUR_AVAILABLE },
        (_, i) => i + FIRST_HOUR_AVAILABLE
      )
    : HOURS_AM_PM;

  const selectableAmPm =
    changeSelectableTime && TIMEZONE_OFFSET_HOURS > 12
      ? [AmPM.PM]
      : [AmPM.AM, AmPM.PM];

  const selectableMinutes =
    TIMEZONE_OFFSET_MINUTES > 0 && changeSelectableTime
      ? Array.from({ length: 30 }, (_, i) => i + TIMEZONE_OFFSET_MINUTES)
      : MINUTES;

  useEffect(() => {
    const { isDirty: isHourFieldDirty } = getFieldState(
      TimeSelectionFields.hour
    );
    const { isDirty: isMinuteFieldDirty } = getFieldState(
      TimeSelectionFields.minute
    );
    const { isDirty: isAmPmFieldDirty } = getFieldState(
      TimeSelectionFields.amPm
    );
    if (changeSelectableTime && !isHourFieldDirty && !editMode) {
      setValue(TimeSelectionFields.hour, Math.floor(FIRST_HOUR_AVAILABLE));
    }
    if (
      changeSelectableTime &&
      TIMEZONE_OFFSET_MINUTES > 0 &&
      !isMinuteFieldDirty &&
      !editMode
    ) {
      setValue(TimeSelectionFields.minute, TIMEZONE_OFFSET_MINUTES);
    }

    if (
      changeSelectableTime &&
      TIMEZONE_OFFSET_HOURS > 12 &&
      !isAmPmFieldDirty &&
      !editMode
    ) {
      setValue(TimeSelectionFields.amPm, AmPM.PM);
    }
  }, [
    selectedTime,
    onDay,
    amPm,
    hour,
    setValue,
    getFieldState,
    isFirstDayOfTheMonthAndPositiveOffset,
    shouldRestrictSelectableHours,
    resetField,
    editMode,
    changeSelectableTime,
    TIMEZONE_OFFSET_MINUTES,
    TIMEZONE_OFFSET_HOURS,
    FIRST_HOUR_AVAILABLE,
  ]);

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
            selectedTime === TimeValue.months) && (
            <TimeFields
              selectableHours={selectableHours}
              selectableMinutes={selectableMinutes}
              selectableAmPm={selectableAmPm}
              shouldRestrictTime={
                shouldRestrictSelectableHours &&
                isFirstDayOfTheMonthAndPositiveOffset
              }
            />
          )}
        </Box>
      </Box>
      {errorInfoAlert}
      {showInfoAlert && (
        <Alert severity="info">{Messages.infoText(timeInfoText)}</Alert>
      )}
    </Box>
  );
};
