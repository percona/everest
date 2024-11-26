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

import { INVALID_SOURCE_RANGE_ERROR, SOURCE_RANGE_PLACEHOLDER } from 'consts';

export const Messages = {
  enableExternalAccess: {
    title: 'Enable External Access',
    caption: `
      Enable this to make this database available outside of the Kubernetes cluster network.
      Exposing your database to remote access poses severe risks, including unauthorized access, data breaches and compliance violations.
    `,
  },
  sourceRange: 'Source Range',
  sourceRangePlaceholder: SOURCE_RANGE_PLACEHOLDER,
  engineParameters: {
    title: 'Set database engine parameters',
    caption:
      'Set your database engine configuration to adjust your database system to your workload and performance needs. For configuration format and specific parameters, check your database type documentation.',
  },
  errors: {
    sourceRange: {
      invalid: INVALID_SOURCE_RANGE_ERROR,
    },
    engineParameters: {
      invalid: 'Invalid',
    },
  },
};
