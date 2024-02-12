// percona-everest-frontend
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import CronTime from 'cron-time-generator';
import { TIME_SELECTION_DEFAULTS } from 'pages/database-form/database-form.constants';
import { DbWizardFormFields } from 'pages/database-form/database-form.types';
import { Messages } from './time-selection.messages';
import { AmPM, TimeProps, TimeValue, WeekDays } from './time-selection.types';

export const addZeroToSingleDigit = (value: number | undefined) => {
  return value?.toString().padStart(2, '0');
};

export const getTimeText = (
  selectedTime: TimeValue,
  hour: number,
  minute: number,
  amPm: string,
  weekDay: string,
  onDay: number
) => {
  const minuteWithZero = addZeroToSingleDigit(minute);

  if (selectedTime === TimeValue.days) {
    return `${Messages.getTimeText.days} ${hour}:${minuteWithZero}${amPm}.`;
  }
  if (selectedTime === TimeValue.weeks) {
    return `${Messages.getTimeText.weeks} ${weekDay}, ${Messages.at} ${hour}:${minuteWithZero}${amPm}.`;
  }
  if (selectedTime === TimeValue.months) {
    return `${Messages.getTimeText.months} ${onDay} ${Messages.at} ${hour}:${minuteWithZero}${amPm}.`;
  }
  return `${Messages.getTimeText.hours} ${minute}.`;
};

export const getCronExpressionFromFormValues = (
  timeProps: TimeProps
): string => {
  const { minute, hour, amPm, onDay, weekDay, selectedTime } = timeProps;

  const parsedMinute = Number(minute);
  const parsedHour = Number(hour);
  const parsedDay = Number(onDay);

  const hour24 =
    amPm === AmPM.PM
      ? parsedHour === 12
        ? parsedHour
        : parsedHour + 12
      : parsedHour === 12
      ? 0
      : parsedHour;

  switch (selectedTime) {
    case TimeValue.hours:
      return CronTime.everyHourAt(parsedMinute);
    case TimeValue.days:
      return CronTime.everyDayAt(hour24, parsedMinute);
    case TimeValue.weeks:
      return CronTime.onSpecificDaysAt([weekDay!], hour24, parsedMinute);
    case TimeValue.months:
      return CronTime.everyMonthOn(parsedDay, hour24, parsedMinute);
    default:
      return CronTime.everyHourAt(5);
  }
};

const getAmPm = (hour: number): AmPM => (hour >= 12 ? AmPM.PM : AmPM.AM);
const getHour12 = (hour24: number): number =>
  hour24 === 12 || hour24 === 0 ? 12 : hour24 % 12;
const getWeekDayByNumber = (weekDay: number): WeekDays =>
  Object.values(WeekDays)[weekDay];

const getSelectedTime = (
  hour: number,
  dayOfMonth: number,
  dayOfWeek: number
): TimeValue => {
  if (!Number.isNaN(dayOfMonth)) return TimeValue.months;
  if (!Number.isNaN(dayOfWeek)) return TimeValue.weeks;
  if (!Number.isNaN(hour)) return TimeValue.days;
  return TimeValue.hours;
};

export const getFormValuesFromCronExpression = (cron: string) => {
  const parts = cron.replace(/\s+/g, ' ').trim().split(' ');

  if (parts.length !== 5) {
    return TIME_SELECTION_DEFAULTS;
  }

  const cronObj = {
    minute: +parts[0],
    hour: +parts[1],
    dayOfMonth: +parts[2],
    month: +parts[3],
    dayOfWeek: +parts[4],
  };

  // TODO during working on EVEREST-485 move DbWizardFormField and ScheduledFormField to "TimeFields" to avoid duplicating

  return {
    [DbWizardFormFields.minute]: !Number.isNaN(cronObj.minute)
      ? cronObj.minute
      : 0,
    [DbWizardFormFields.hour]: !Number.isNaN(cronObj.hour)
      ? getHour12(cronObj.hour)
      : 12,
    [DbWizardFormFields.amPm]: !Number.isNaN(cronObj.hour)
      ? getAmPm(cronObj.hour)
      : AmPM.AM,
    [DbWizardFormFields.onDay]: !Number.isNaN(cronObj.dayOfMonth)
      ? cronObj.dayOfMonth
      : 1,
    [DbWizardFormFields.weekDay]: !Number.isNaN(cronObj.dayOfWeek)
      ? getWeekDayByNumber(cronObj.dayOfWeek)
      : WeekDays.Mo,
    [DbWizardFormFields.selectedTime]: getSelectedTime(
      cronObj.hour,
      cronObj.dayOfMonth,
      cronObj.dayOfWeek
    ),
  };
};
