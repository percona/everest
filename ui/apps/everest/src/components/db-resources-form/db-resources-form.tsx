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

import { Box, FormGroup } from '@mui/material';
import { ToggleButtonGroupInput, ToggleCard } from '@percona/ui-lib';
import { useResourcesForm } from './use-resource-form';
import {
  DbResourcesFields,
  ResourcesFormFieldsProps,
  ResourceSize,
} from './db-resources-form.types';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { Messages } from './db-resources-form.messages';
import { NODES_DB_TYPE_MAP } from './db-resources-form.const';
import {
  checkResourceText,
  humanizeResourceSizeMap,
} from './db-resources-form.utils';
import { ResourceInput } from './resource-input/resource-input';

const DBResourcesForm = ({ mode, dbType }: ResourcesFormFieldsProps) => {
  const { isMobile, isDesktop } = useActiveBreakpoint();

  const {
    resourcesInfo,
    numberOfNodes,
    cpuCapacityExceeded,
    memoryCapacityExceeded,
    diskCapacityExceeded,
  } = useResourcesForm({ mode });

  return (
    <>
      <FormGroup sx={{ mt: 3 }}>
        <ToggleButtonGroupInput
          name={DbResourcesFields.numberOfNodes}
          label={Messages.labels.numberOfNodes}
        >
          {NODES_DB_TYPE_MAP[dbType].map((value) => (
            <ToggleCard
              value={value}
              data-testid={`toggle-button-nodes-${value}`}
              key={value}
            >
              {`${value} node${+value > 1 ? 's' : ''}`}
            </ToggleCard>
          ))}
        </ToggleButtonGroupInput>
        <ToggleButtonGroupInput
          name={DbResourcesFields.resourceSizePerNode}
          label={Messages.labels.resourceSizePerNode}
        >
          <ToggleCard
            value={ResourceSize.small}
            data-testid="toggle-button-small"
          >
            {humanizeResourceSizeMap(ResourceSize.small)}
          </ToggleCard>
          <ToggleCard
            value={ResourceSize.medium}
            data-testid="toggle-button-medium"
          >
            {humanizeResourceSizeMap(ResourceSize.medium)}
          </ToggleCard>
          <ToggleCard
            value={ResourceSize.large}
            data-testid="toggle-button-large"
          >
            {humanizeResourceSizeMap(ResourceSize.large)}
          </ToggleCard>
          <ToggleCard
            value={ResourceSize.custom}
            data-testid="toggle-button-custom"
          >
            {humanizeResourceSizeMap(ResourceSize.custom)}
          </ToggleCard>
        </ToggleButtonGroupInput>
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'center',
            marginTop: 2,
            gap: isDesktop ? 4 : 2,
            '& > *': {
              width: isMobile ? '100%' : '33%',
              '&> *': {
                width: '100%',
              },
            },
          }}
        >
          <ResourceInput
            name={DbResourcesFields.cpu}
            label={Messages.labels.cpu.toUpperCase()}
            helperText={checkResourceText(
              resourcesInfo?.available?.cpuMillis,
              'CPU',
              Messages.labels.cpu,
              cpuCapacityExceeded
            )}
            endSuffix="CPU"
            numberOfNodes={+numberOfNodes}
          />
          <ResourceInput
            name={DbResourcesFields.memory}
            label={Messages.labels.memory.toUpperCase()}
            helperText={checkResourceText(
              resourcesInfo?.available?.memoryBytes,
              'GB',
              Messages.labels.memory,
              memoryCapacityExceeded
            )}
            endSuffix="GB"
            numberOfNodes={+numberOfNodes}
          />
          <ResourceInput
            name={DbResourcesFields.disk}
            disabled={mode === 'edit'}
            label={Messages.labels.disk.toUpperCase()}
            helperText={checkResourceText(
              resourcesInfo?.available?.diskSize,
              'GB',
              Messages.labels.disk,
              diskCapacityExceeded
            )}
            endSuffix="GB"
            numberOfNodes={+numberOfNodes}
          />
        </Box>
      </FormGroup>
    </>
  );
};

export default DBResourcesForm;
