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

import { DbResourcesFields, ResourceSize } from './db-resources-form.types';
import { DbType } from '@percona/types';

export const DEFAULT_SIZES = {
  [ResourceSize.small]: {
    [DbResourcesFields.cpu]: 1,
    [DbResourcesFields.memory]: 2,
    [DbResourcesFields.disk]: 25,
  },
  [ResourceSize.medium]: {
    [DbResourcesFields.cpu]: 4,
    [DbResourcesFields.memory]: 8,
    [DbResourcesFields.disk]: 100,
  },
  [ResourceSize.large]: {
    [DbResourcesFields.cpu]: 8,
    [DbResourcesFields.memory]: 32,
    [DbResourcesFields.disk]: 200,
  },
};

export const NODES_DB_TYPE_MAP: Record<DbType, string[]> = {
  [DbType.Mongo]: ['1', '3', '5'],
  [DbType.Mysql]: ['1', '3', '5'],
  [DbType.Postresql]: ['1', '2', '3'],
};
