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

import { ResourceSize } from './resources-step.types.ts';
import { DEFAULT_SIZES } from './resources-step.const.ts';
import { DbCluster } from 'shared-types/dbCluster.types';
import { memoryParser } from 'utils/k8ResourceParser';
import { Messages } from './resources-step.messages.ts';

const humanizedResourceSizeMap: Record<ResourceSize, string> = {
  [ResourceSize.small]: 'Small',
  [ResourceSize.medium]: 'Medium',
  [ResourceSize.large]: 'Large',
  [ResourceSize.custom]: 'Custom',
};

export const humanizeResourceSizeMap = (type: ResourceSize): string =>
  humanizedResourceSizeMap[type];

export const getResourceNames = (names: string[]): string => {
  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  if (names.length === 3) {
    return `${names[0]}, ${names[1]}, and ${names[2]}`;
  }

  return '';
};

export const matchFieldsValueToResourceSize = (
  dbCluster: DbCluster
): ResourceSize => {
  const resources = dbCluster?.spec?.engine?.resources;

  if (!resources) {
    return ResourceSize.custom;
  }

  const size = memoryParser(
    dbCluster?.spec?.engine?.storage?.size.toString(),
    'Gi'
  );
  const memory = memoryParser(resources.memory.toString(), 'G');

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

export const checkResourceText = (
  value: string | number | undefined,
  units: string,
  fieldLabel: string,
  exceedFlag: boolean
) => {
  if (value) {
    const parsedNumber = Number(value);

    if (Number.isNaN(parsedNumber)) {
      return '';
    }

    const processedValue =
      fieldLabel === Messages.labels.cpu
        ? parsedNumber / 1000
        : parsedNumber / 10 ** 9;

    if (exceedFlag) {
      return Messages.alerts.resourcesCapacityExceeding(
        fieldLabel,
        processedValue,
        units
      );
    }
    return Messages.labels.estimated(processedValue.toFixed(2), units);
  }
  return '';
};
