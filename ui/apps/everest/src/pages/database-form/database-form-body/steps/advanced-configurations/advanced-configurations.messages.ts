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

import { SOURCE_RANGE_MESSAGE } from 'consts';

// limitations under the License.
export const Messages = {
  advanced: 'Advanced Configurations',
  caption: `
    Exposing your database to the internet poses severe risks, including unauthorized access, data breaches,
    theft of sensitive information, data manipulation, compliance violations, legal consequences, and reputational damage.
    Secure your database with strong controls, encryption, and firewalls. Use secure remote access, regularly back up data, and conduct security audits.
  `,
  enableExternalAccess: {
    title: 'Enable External Access',
    caption: `
      Enable this to make this database available outside of the Kubernetes cluster network.
      Exposing your database to remote access poses severe risks, including unauthorized access, data breaches and compliance violations.
    `,
  },
  internetFacing: 'Internet Facing',
  sourceRange: 'Source Range',
  sourceRangePlaceholder: SOURCE_RANGE_MESSAGE,
  engineParameters: {
    title: 'Set database engine parameters',
    caption:
      'Set your database engine configuration to adjust your database system to your workload and performance needs. For configuration format and specific parameters, check your database type documentation.',
  },
};
