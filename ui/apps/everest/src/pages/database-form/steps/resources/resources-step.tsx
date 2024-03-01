import { Box, FormGroup } from '@mui/material';
import { DbType } from '@percona/types';
import { ToggleButtonGroupInput, ToggleCard } from '@percona/ui-lib';
import { useKubernetesClusterResourcesInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterResourcesInfo';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { NODES_DB_TYPE_MAP } from '../../database-form.constants';
import { DbWizardFormFields } from '../../database-form.types';
import { useDatabasePageMode } from '../../useDatabasePageMode';
import { StepHeader } from '../step-header/step-header.tsx';
import { ResourceInput } from './resource-input/resource-input';
import { DEFAULT_SIZES } from './resources-step.const';
import { Messages } from './resources-step.messages.ts';
import { ResourceSize } from './resources-step.types';
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
  const [cpu, memory, disk, dbType, numberOfNodes]: [
    number,
    number,
    number,
    DbType,
    number,
  ] = watch([
    DbWizardFormFields.cpu,
    DbWizardFormFields.memory,
    DbWizardFormFields.disk,
    DbWizardFormFields.dbType,
    DbWizardFormFields.numberOfNodes,
  ]);

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
    if (resourceSizePerNode === ResourceSize.custom) {
      return;
    }

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
  }, [resourceSizePerNode, mode, setValue]);

  useEffect(() => {
    if (diskCapacityExceeded) {
      setError(DbWizardFormFields.disk, { type: 'custom' });
    } else {
      clearErrors(DbWizardFormFields.disk);
    }
  }, [diskCapacityExceeded]);

  useEffect(() => {
    if (resourceSizePerNode === ResourceSize.custom) {
      return;
    }

    [
      [cpu, 'cpu'],
      [disk, 'disk'],
      [memory, 'memory'],
    ].forEach((resource) => {
      const [value, name] = resource as [number, 'cpu' | 'disk' | 'memory'];
      if (value !== DEFAULT_SIZES[resourceSizePerNode][name]) {
        setValue(DbWizardFormFields.resourceSizePerNode, ResourceSize.custom);
      }
    });
  }, [cpu, disk, memory]);

  return (
    <>
      <StepHeader
        pageTitle={Messages.pageTitle}
        pageDescription={Messages.pageDescription}
      />
      <FormGroup sx={{ mt: 2 }}>
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
          {(Object.keys(ResourceSize) as Array<keyof typeof ResourceSize>).map(
            (value) => (
              <ToggleCard
                value={ResourceSize[value]}
                data-testid={`toggle-button-${value}`}
              >
                {humanizeResourceSizeMap(ResourceSize[value])}
              </ToggleCard>
            )
          )}
        </ToggleButtonGroupInput>
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'center',
            marginTop: 4,
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
