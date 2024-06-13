import { Box, FormGroup } from '@mui/material';
import { DbType } from '@percona/types';
import { ToggleButtonGroupInput, ToggleCard } from '@percona/ui-lib';
import { useKubernetesClusterResourcesInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterResourcesInfo';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { NODES_DB_TYPE_MAP } from '../../../database-form.constants.ts';
import { DbWizardFormFields } from '../../../database-form.types.ts';
import { useDatabasePageMode } from '../../../useDatabasePageMode.ts';
import { StepHeader } from '../step-header/step-header.tsx';
import { ResourceInput } from './resource-input/resource-input.tsx';
import { DEFAULT_SIZES } from './resources-step.const.ts';
import { Messages } from './resources-step.messages.ts';
import { ResourceSize } from './resources-step.types.ts';
import {
  checkResourceText,
  humanizeResourceSizeMap,
} from './resources-step.utils.ts';

export const ResourcesStep = () => {
  const { watch, setValue, setError, clearErrors } = useFormContext();
  const mode = useDatabasePageMode();
  const { data: resourcesInfo, isFetching: resourcesInfoLoading } =
    useKubernetesClusterResourcesInfo();

  const { isMobile, isDesktop } = useActiveBreakpoint();

  const resourceSizePerNode: ResourceSize = watch(
    DbWizardFormFields.resourceSizePerNode
  );
  const cpu: number = watch(DbWizardFormFields.cpu);
  const memory: number = watch(DbWizardFormFields.memory);
  const disk: number = watch(DbWizardFormFields.disk);
  const dbType: DbType = watch(DbWizardFormFields.dbType);
  const numberOfNodes = watch(DbWizardFormFields.numberOfNodes);

  const cpuCapacityExceeded = resourcesInfo
    ? cpu * 1000 > resourcesInfo?.available.cpuMillis
    : !resourcesInfoLoading;
  const memoryCapacityExceeded = resourcesInfo
    ? memory * 1000 ** 3 > resourcesInfo?.available.memoryBytes
    : !resourcesInfoLoading;
  const diskCapacityExceeded = resourcesInfo?.available?.diskSize
    ? disk * 1000 ** 3 > resourcesInfo?.available.diskSize
    : false;

  useEffect(() => {
    if (resourceSizePerNode && resourceSizePerNode !== ResourceSize.custom) {
      setValue(DbWizardFormFields.cpu, DEFAULT_SIZES[resourceSizePerNode].cpu);
      if (mode !== 'edit') {
        setValue(
          DbWizardFormFields.disk,
          DEFAULT_SIZES[resourceSizePerNode].disk
        );
      }
      setValue(
        DbWizardFormFields.memory,
        DEFAULT_SIZES[resourceSizePerNode].memory
      );
    }
  }, [resourceSizePerNode, mode, setValue]);

  useEffect(() => {
    if (diskCapacityExceeded) {
      setError(DbWizardFormFields.disk, { type: 'custom' });
    } else clearErrors(DbWizardFormFields.disk);
  }, [diskCapacityExceeded, clearErrors, setError]);

  useEffect(() => {
    if (
      resourceSizePerNode !== ResourceSize.custom &&
      cpu !== DEFAULT_SIZES[resourceSizePerNode].cpu
    ) {
      setValue(DbWizardFormFields.resourceSizePerNode, ResourceSize.custom);
    }
  }, [cpu]);

  useEffect(() => {
    if (
      resourceSizePerNode !== ResourceSize.custom &&
      disk !== DEFAULT_SIZES[resourceSizePerNode].disk
    ) {
      setValue(DbWizardFormFields.resourceSizePerNode, ResourceSize.custom);
    }
  }, [disk]);

  useEffect(() => {
    if (
      resourceSizePerNode !== ResourceSize.custom &&
      memory !== DEFAULT_SIZES[resourceSizePerNode].memory
    ) {
      setValue(DbWizardFormFields.resourceSizePerNode, ResourceSize.custom);
    }
  }, [memory]);

  return (
    <>
      <StepHeader
        pageTitle={Messages.pageTitle}
        pageDescription={Messages.pageDescription}
      />
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
            numberOfNodes={numberOfNodes}
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
            numberOfNodes={numberOfNodes}
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
            numberOfNodes={numberOfNodes}
          />
        </Box>
      </FormGroup>
    </>
  );
};
