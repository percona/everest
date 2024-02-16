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
import { z } from 'zod';
import {
  AmPM,
  TimeValue,
  WeekDays,
} from 'components/time-selection/time-selection.types';
import { IP_REGEX } from 'consts';
import { Messages } from './default-configurations.messages';

export enum DefaultConfigurationsFields {
  monitoring = 'monitoring',
  backupsEnabled = 'backupsEnabled',
  externalAccess = 'externalAccess',
  sourceRanges = 'sourceRanges',
  selectedTime = 'selectTime',
  minute = 'minute',
  hour = 'hour',
  amPm = 'amPm',
  weekDay = 'weekDay',
  onDay = 'onDay',
}

const baseDefaultConfigurationsSchema = z.object({
  [DefaultConfigurationsFields.monitoring]: z.boolean(),
  [DefaultConfigurationsFields.backupsEnabled]: z.boolean(),
  [DefaultConfigurationsFields.externalAccess]: z.boolean(),
  [DefaultConfigurationsFields.selectedTime]: z.nativeEnum(TimeValue),
  [DefaultConfigurationsFields.minute]: z.number(),
  [DefaultConfigurationsFields.hour]: z.number(),
  [DefaultConfigurationsFields.amPm]: z.nativeEnum(AmPM),
  [DefaultConfigurationsFields.weekDay]: z.nativeEnum(WeekDays),
  [DefaultConfigurationsFields.onDay]: z.number(),
  [DefaultConfigurationsFields.sourceRanges]: z.array(
    z.object({ sourceRange: z.string().optional() })
  ),
});

export const defaultConfigurationsSchema = baseDefaultConfigurationsSchema
  .passthrough()
  .superRefine((schema, ctx) => {
    if (schema.externalAccess) {
      schema.sourceRanges.forEach(({ sourceRange }, index) => {
        if (!sourceRange?.match(IP_REGEX)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: Messages.errors.invalidIP,
            path: [
              DefaultConfigurationsFields.sourceRanges,
              index,
              'sourceRange',
            ],
          });
        }
      });
    }
  });

export type DefaultConfigurationsType = z.infer<
  typeof baseDefaultConfigurationsSchema
>;
