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

import { DbCluster } from 'shared-types/dbCluster.types';
import { memoryParser } from 'utils/k8ResourceParser';
import {
  DEFAULT_SIZES,
  ResourceSize,
} from 'components/cluster-form/resources/constants.ts';

export const matchFieldsValueToResourceSize = (
  dbCluster: DbCluster
): ResourceSize => {
  const resources = dbCluster?.spec?.engine?.resources;

  if (!resources) {
    return ResourceSize.custom;
  }

  const size = memoryParser(dbCluster?.spec?.engine?.storage?.size.toString());
  const memory = memoryParser(resources.memory.toString());

  const res = Object.values(DEFAULT_SIZES).findIndex(
    (item) =>
      item.cpu === Number(resources.cpu) &&
      item.memory === memory &&
      item.disk === size
  );
  return res !== -1
    ? (Object.keys(DEFAULT_SIZES)[res] as ResourceSize)
    : ResourceSize.custom;
};
