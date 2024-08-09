import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Box,
  FormGroup,
  InputAdornment,
  Typography,
  useTheme,
} from '@mui/material';
import { DbType } from '@percona/types';
import { TextInput, ToggleButtonGroupInput, ToggleCard } from '@percona/ui-lib';
import { DbWizardFormFields } from 'consts';
import { useKubernetesClusterResourcesInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterResourcesInfo';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import {
  DEFAULT_SIZES,
  humanizedResourceSizeMap,
  NODES_DB_TYPE_MAP,
  ResourceSize,
} from './constants';

type Props = {
  dbType: DbType;
  disableDiskInput?: boolean;
  allowDiskInputUpdate?: boolean;
};

type ResourceInputProps = {
  name: string;
  label: string;
  helperText: string;
  endSuffix: string;
  numberOfNodes: number;
  disabled?: boolean;
};

const humanizeResourceSizeMap = (type: ResourceSize): string =>
  humanizedResourceSizeMap[type];

const resourcesCapacityExceeding = (
  fieldName: string,
  value: number | undefined,
  units: string
) =>
  `Your specified ${fieldName} size exceeds the ${
    value ? `${value.toFixed(2)} ${units}` : ''
  } available. Enter a smaller value before continuing.`;

const estimated = (value: string | number | undefined, units: string) =>
  value ? `Estimated available: ${value} ${units}` : '';

const checkResourceText = (
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
      fieldLabel === 'cpu' ? parsedNumber / 1000 : parsedNumber / 10 ** 9;

    if (exceedFlag) {
      return resourcesCapacityExceeding(fieldLabel, processedValue, units);
    }
    return estimated(processedValue.toFixed(2), units);
  }
  return '';
};

const ResourceInput = ({
  name,
  label,
  helperText,
  endSuffix,
  numberOfNodes,
  disabled,
}: ResourceInputProps) => {
  const { isDesktop } = useActiveBreakpoint();
  const theme = useTheme();
  const { watch } = useFormContext();
  const value: number = watch(name);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row' }}>
      <TextInput
        name={name}
        textFieldProps={{
          variant: 'outlined',
          label,
          helperText,
          disabled,
          InputProps: {
            endAdornment: (
              <InputAdornment position="end">{endSuffix}</InputAdornment>
            ),
          },
        }}
      />
      {isDesktop && numberOfNodes && (
        <Box sx={{ ml: 1, pt: 0.5, flexBasis: 'fit-content' }}>
          <Typography
            variant="caption"
            sx={{ whiteSpace: 'nowrap' }}
            color={theme.palette.text.secondary}
          >{`x ${numberOfNodes} node${
            +numberOfNodes > 1 ? 's' : ''
          }`}</Typography>
          {value && numberOfNodes && (
            <Typography
              variant="body1"
              sx={{ whiteSpace: 'nowrap' }}
              color={theme.palette.text.secondary}
              data-testid={`${name}-resource-sum`}
            >{` = ${(value * numberOfNodes).toFixed(2)} ${endSuffix}`}</Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

const ResourcesForm = ({
  dbType,
  disableDiskInput,
  allowDiskInputUpdate,
}: Props) => {
  const { isMobile, isDesktop } = useActiveBreakpoint();
  const { data: resourcesInfo, isFetching: resourcesInfoLoading } =
    useKubernetesClusterResourcesInfo();
  const { watch, setValue, setError, clearErrors } = useFormContext();

  const resourceSizePerNode: ResourceSize = watch(
    DbWizardFormFields.resourceSizePerNode
  );
  const cpu: number = watch(DbWizardFormFields.cpu);
  const memory: number = watch(DbWizardFormFields.memory);
  const disk: number = watch(DbWizardFormFields.disk);
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
      if (allowDiskInputUpdate) {
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
  }, [resourceSizePerNode, allowDiskInputUpdate, setValue]);

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
  }, [cpu, setValue]);

  useEffect(() => {
    if (
      resourceSizePerNode !== ResourceSize.custom &&
      disk !== DEFAULT_SIZES[resourceSizePerNode].disk
    ) {
      setValue(DbWizardFormFields.resourceSizePerNode, ResourceSize.custom);
    }
  }, [disk, setValue]);

  useEffect(() => {
    if (
      resourceSizePerNode !== ResourceSize.custom &&
      memory !== DEFAULT_SIZES[resourceSizePerNode].memory
    ) {
      setValue(DbWizardFormFields.resourceSizePerNode, ResourceSize.custom);
    }
  }, [memory, setValue]);

  return (
    <FormGroup sx={{ mt: 3 }}>
      <ToggleButtonGroupInput
        name={DbWizardFormFields.numberOfNodes}
        label={'Number of nodes'}
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
        label={'resourceSizePerNode'}
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
          label="CPU"
          helperText={checkResourceText(
            resourcesInfo?.available?.cpuMillis,
            'CPU',
            'cpu',
            cpuCapacityExceeded
          )}
          endSuffix="CPU"
          numberOfNodes={numberOfNodes}
        />
        <ResourceInput
          name={DbWizardFormFields.memory}
          label="MEMORY"
          helperText={checkResourceText(
            resourcesInfo?.available?.memoryBytes,
            'GB',
            'memory',
            memoryCapacityExceeded
          )}
          endSuffix="GB"
          numberOfNodes={numberOfNodes}
        />
        <ResourceInput
          name={DbWizardFormFields.disk}
          disabled={disableDiskInput}
          label="DISK"
          helperText={checkResourceText(
            resourcesInfo?.available?.diskSize,
            'GB',
            'disk',
            diskCapacityExceeded
          )}
          endSuffix="GB"
          numberOfNodes={numberOfNodes}
        />
      </Box>
    </FormGroup>
  );
};

export default ResourcesForm;
