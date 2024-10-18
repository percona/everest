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
import { AdvancedConfigurationFields } from './advanced-configuration.types';
import { IP_REGEX } from 'consts';
import { Messages } from './messages';

export const advancedConfigurationsSchema = z
  .object({
    [AdvancedConfigurationFields.externalAccess]: z.boolean(),
    // internetFacing: z.boolean(),
    [AdvancedConfigurationFields.sourceRanges]: z.array(
      z.object({ sourceRange: z.string().optional() })
    ),
    [AdvancedConfigurationFields.engineParametersEnabled]: z.boolean(),
    [AdvancedConfigurationFields.engineParameters]: z.string().optional(),
  })
  .passthrough()
  .superRefine(({ sourceRanges }, ctx) => {
    sourceRanges.forEach(({ sourceRange }, index) => {
      if (sourceRange && IP_REGEX.exec(sourceRange) === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_string,
          validation: 'ip',
          path: [
            AdvancedConfigurationFields.sourceRanges,
            index,
            'sourceRange',
          ],
          message: Messages.errors.sourceRange.invalid,
        });
      }
    });
  });

export type AdvancedConfigurationFormType = z.infer<
  typeof advancedConfigurationsSchema
>;
