// everest
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

import {
  AmPM,
  TimeSelectionFields,
  TimeValue,
  WeekDays,
} from './time-selection.types';

export const MINUTES = Array.from({ length: 60 }, (_, i) => i);
export const DAYS_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
export const HOURS_AM_PM = Array.from({ length: 12 }, (_, i) => i + 1);
export const AM_PM = [AmPM.AM, AmPM.PM];

export const TIME_SELECTION_DEFAULTS = {
  [TimeSelectionFields.selectedTime]: TimeValue.days,
  [TimeSelectionFields.minute]: 0,
  [TimeSelectionFields.hour]: 1,
  [TimeSelectionFields.amPm]: AmPM.AM,
  [TimeSelectionFields.weekDay]: WeekDays.Mo,
  [TimeSelectionFields.onDay]: 1,
};
