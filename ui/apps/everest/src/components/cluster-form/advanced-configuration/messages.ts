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
  DUPLICATE_SOURCE_RANGE_ERROR,
  INVALID_SOURCE_RANGE_ERROR,
  SOURCE_RANGE_PLACEHOLDER,
} from 'consts';

export const Messages = {
  enable: 'Enable',
  sourceRange: 'Source Range',
  sourceRangePlaceholder: SOURCE_RANGE_PLACEHOLDER,
  placeholders: {
    storageClass: 'Storage class',
  },
  cards: {
    storage: {
      title: 'Storage',
      description:
        'Defines the type and performance of storage for your database. Select based on workload needs, such as high IOPS for fast access or cost-effective options for less frequent use.',
    },
    policies: {
      title: 'Pod scheduling policy',
      description: 'Select one of the available pod scheduling policies.',
    },
    enableExternalAccess: {
      title: 'External Access',
      description: `
        Enable this to make this database available outside of the Kubernetes cluster network.
        Exposing your database to remote access poses severe risks, including unauthorized access, data breaches and compliance violations.
      `,
    },
    engineParameters: {
      title: 'Set database engine parameters',
      description:
        'Set your database engine configuration to adjust your database system to your workload and performance needs. For configuration format and specific parameters, check your database type documentation.',
    },
  },
  errors: {
    sourceRange: {
      invalid: INVALID_SOURCE_RANGE_ERROR,
      duplicate: DUPLICATE_SOURCE_RANGE_ERROR,
    },
    storageClass: {
      invalid: 'Invalid storage class',
    },
    engineParameters: {
      invalid: 'Invalid',
    },
  },
  tooltipTexts: {
    storageClass: 'Storage can’t be changed.',
    noPolicies:
      'Seems like you don’t have permission to read any pod scheduling policy.',
  },
};
