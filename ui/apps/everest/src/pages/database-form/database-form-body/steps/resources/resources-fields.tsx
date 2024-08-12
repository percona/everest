import { Box, FormGroup } from '@mui/material';
import { DbType } from '@percona/types';
import { ToggleButtonGroupInput, ToggleCard } from '@percona/ui-lib';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { NODES_DB_TYPE_MAP } from '../../../database-form.constants.ts';
import { DbWizardFormFields } from '../../../database-form.types.ts';
import { ResourceInput } from '../../../../../components/db-resources-form/resource-input/resource-input.tsx';
import { Messages } from '../../../../../components/db-resources-form/db-resources-form.messages.ts';
import { ResourceSize } from '../../../../../components/db-resources-form/db-resources-form.types.ts';
import {
  checkResourceText,
  humanizeResourceSizeMap,
} from '../../../../../components/db-resources-form/db-resources-form.utils.ts';
import { useResourcesForm } from './useResourcesForm';

interface ResourcesFormFieldsProps {
  dbType: DbType;
  memoryBytes?: number;
  mode: 'new' | 'edit';
}

export const ResourcesFormFields = ({
  mode,
  dbType,
}: ResourcesFormFieldsProps) => {
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
          name={DbWizardFormFields.numberOfNodes}
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
          name={DbWizardFormFields.resourceSizePerNode}
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
            name={DbWizardFormFields.cpu}
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
            name={DbWizardFormFields.memory}
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
            name={DbWizardFormFields.disk}
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
      {/*<FormGroup sx={{ mt: 3 }}>*/}
      {/*  <ToggleButtonGroupInput*/}
      {/*    name={DbWizardFormFields.numberOfNodes}*/}
      {/*    label={Messages.labels.numberOfNodes}*/}
      {/*  >*/}
      {/*    {NODES_DB_TYPE_MAP[dbType].map((value) => (*/}
      {/*      <ToggleCard*/}
      {/*        value={value}*/}
      {/*        data-testid={`toggle-button-nodes-${value}`}*/}
      {/*        key={value}*/}
      {/*      >*/}
      {/*        {`${value} node${+value > 1 ? 's' : ''}`}*/}
      {/*      </ToggleCard>*/}
      {/*    ))}*/}
      {/*  </ToggleButtonGroupInput>*/}
      {/*  <ToggleButtonGroupInput*/}
      {/*    name={DbWizardFormFields.resourceSizePerNode}*/}
      {/*    label={Messages.labels.resourceSizePerNode}*/}
      {/*  >*/}
      {/*    <ToggleCard*/}
      {/*      value={ResourceSize.small}*/}
      {/*      data-testid="toggle-button-small"*/}
      {/*    >*/}
      {/*      {humanizeResourceSizeMap(ResourceSize.small)}*/}
      {/*    </ToggleCard>*/}
      {/*    <ToggleCard*/}
      {/*      value={ResourceSize.medium}*/}
      {/*      data-testid="toggle-button-medium"*/}
      {/*    >*/}
      {/*      {humanizeResourceSizeMap(ResourceSize.medium)}*/}
      {/*    </ToggleCard>*/}
      {/*    <ToggleCard*/}
      {/*      value={ResourceSize.large}*/}
      {/*      data-testid="toggle-button-large"*/}
      {/*    >*/}
      {/*      {humanizeResourceSizeMap(ResourceSize.large)}*/}
      {/*    </ToggleCard>*/}
      {/*    <ToggleCard*/}
      {/*      value={ResourceSize.custom}*/}
      {/*      data-testid="toggle-button-custom"*/}
      {/*    >*/}
      {/*      {humanizeResourceSizeMap(ResourceSize.custom)}*/}
      {/*    </ToggleCard>*/}
      {/*  </ToggleButtonGroupInput>*/}
      {/*  <Box*/}
      {/*    sx={{*/}
      {/*      display: 'flex',*/}
      {/*      flexDirection: isMobile ? 'column' : 'row',*/}
      {/*      justifyContent: 'center',*/}
      {/*      marginTop: 2,*/}
      {/*      gap: isDesktop ? 4 : 2,*/}
      {/*      '& > *': {*/}
      {/*        width: isMobile ? '100%' : '33%',*/}
      {/*        '&> *': {*/}
      {/*          width: '100%',*/}
      {/*        },*/}
      {/*      },*/}
      {/*    }}*/}
      {/*  >*/}
      {/*    <ResourceInput*/}
      {/*      name={DbWizardFormFields.cpu}*/}
      {/*      label={Messages.labels.cpu.toUpperCase()}*/}
      {/*      helperText={checkResourceText(*/}
      {/*        resourcesInfo?.available?.cpuMillis,*/}
      {/*        'CPU',*/}
      {/*        Messages.labels.cpu,*/}
      {/*        cpuCapacityExceeded*/}
      {/*      )}*/}
      {/*      endSuffix="CPU"*/}
      {/*      numberOfNodes={numberOfNodes}*/}
      {/*    />*/}
      {/*    <ResourceInput*/}
      {/*      name={DbWizardFormFields.memory}*/}
      {/*      label={Messages.labels.memory.toUpperCase()}*/}
      {/*      helperText={checkResourceText(*/}
      {/*        resourcesInfo?.available?.memoryBytes,*/}
      {/*        'GB',*/}
      {/*        Messages.labels.memory,*/}
      {/*        memoryCapacityExceeded*/}
      {/*      )}*/}
      {/*      endSuffix="GB"*/}
      {/*      numberOfNodes={numberOfNodes}*/}
      {/*    />*/}
      {/*    <ResourceInput*/}
      {/*      name={DbWizardFormFields.disk}*/}
      {/*      disabled={mode === 'edit'}*/}
      {/*      label={Messages.labels.disk.toUpperCase()}*/}
      {/*      helperText={checkResourceText(*/}
      {/*        resourcesInfo?.available?.diskSize,*/}
      {/*        'GB',*/}
      {/*        Messages.labels.disk,*/}
      {/*        diskCapacityExceeded*/}
      {/*      )}*/}
      {/*      endSuffix="GB"*/}
      {/*      numberOfNodes={numberOfNodes}*/}
      {/*    />*/}
      {/*  </Box>*/}
      {/*</FormGroup>*/}
    </>
  );
};
