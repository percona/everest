import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Accordion,
  AccordionSummary,
  Box,
  Divider,
  FormGroup,
  InputAdornment,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { TextInput, ToggleButtonGroupInput, ToggleCard } from '@percona/ui-lib';
import { useKubernetesClusterResourcesInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterResourcesInfo';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import {
  CUSTOM_NR_UNITS_INPUT_VALUE,
  DEFAULT_SIZES,
  humanizedResourceSizeMap,
  NODES_DB_TYPE_MAP,
  ResourceSize,
} from './constants';
import { DbWizardFormFields } from 'consts';
import { DbType } from '@percona/types';
import { getProxyUnitNamesFromDbType } from './utils';

type Props = {
  unit?: string;
  unitPlural?: string;
  options: string[];
  resourceSizePerUnitInputName: string;
  cpuInputName: string;
  diskInputName: string;
  memoryInputName: string;
  numberOfUnitsInputName: string;
  customNrOfUnitsInputName: string;
  disableDiskInput?: boolean;
  allowDiskInputUpdate?: boolean;
};

type ResourceInputProps = {
  unit: string;
  unitPlural: string;
  name: string;
  label: string;
  helperText: string;
  endSuffix: string;
  numberOfUnits: number;
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
  unit,
  unitPlural,
  name,
  label,
  helperText,
  endSuffix,
  numberOfUnits,
  disabled,
}: ResourceInputProps) => {
  const { isDesktop } = useActiveBreakpoint();
  const theme = useTheme();
  const { watch } = useFormContext();
  const value: number = watch(name);

  if ((numberOfUnits && Number.isNaN(numberOfUnits)) || numberOfUnits < 1) {
    numberOfUnits = 1;
  }

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
      {isDesktop && numberOfUnits && (
        <Box sx={{ ml: 1, pt: 0.5, flexBasis: 'fit-content' }}>
          <Typography
            variant="caption"
            sx={{ whiteSpace: 'nowrap' }}
            color={theme.palette.text.secondary}
          >{`x ${numberOfUnits} ${+numberOfUnits > 1 ? unitPlural : unit}`}</Typography>
          {value && numberOfUnits && (
            <Typography
              variant="body1"
              sx={{ whiteSpace: 'nowrap' }}
              color={theme.palette.text.secondary}
              data-testid={`${name}-resource-sum`}
            >{` = ${(value * numberOfUnits).toFixed(2)} ${endSuffix}`}</Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

const ResourcesToggles = ({
  unit = 'node',
  unitPlural = `${unit}s`,
  options,
  resourceSizePerUnitInputName,
  cpuInputName,
  diskInputName,
  memoryInputName,
  numberOfUnitsInputName,
  customNrOfUnitsInputName,
  disableDiskInput,
  allowDiskInputUpdate,
}: Props) => {
  const { isMobile, isDesktop } = useActiveBreakpoint();
  const { data: resourcesInfo, isFetching: resourcesInfoLoading } =
    useKubernetesClusterResourcesInfo();
  const { watch, setValue, setError, clearErrors, resetField } =
    useFormContext();

  const resourceSizePerUnit: ResourceSize = watch(resourceSizePerUnitInputName);
  const cpu: number = watch(cpuInputName);
  const memory: number = watch(memoryInputName);
  const disk: number = watch(diskInputName);
  const numberOfUnits: string = watch(numberOfUnitsInputName);
  const customNrOfUnits: string = watch(customNrOfUnitsInputName);
  const intNumberOfUnits = parseInt(
    numberOfUnits === CUSTOM_NR_UNITS_INPUT_VALUE
      ? customNrOfUnits
      : numberOfUnits,
    10
  );

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
    if (resourceSizePerUnit && resourceSizePerUnit !== ResourceSize.custom) {
      setValue(cpuInputName, DEFAULT_SIZES[resourceSizePerUnit].cpu);
      if (allowDiskInputUpdate) {
        setValue(diskInputName, DEFAULT_SIZES[resourceSizePerUnit].disk);
      }
      setValue(memoryInputName, DEFAULT_SIZES[resourceSizePerUnit].memory);
    }
  }, [resourceSizePerUnit, allowDiskInputUpdate, setValue]);

  useEffect(() => {
    if (diskCapacityExceeded) {
      setError(diskInputName, { type: 'custom' });
    } else clearErrors(diskInputName);
  }, [diskCapacityExceeded, clearErrors, setError]);

  useEffect(() => {
    if (
      resourceSizePerUnit !== ResourceSize.custom &&
      cpu !== DEFAULT_SIZES[resourceSizePerUnit].cpu
    ) {
      setValue(resourceSizePerUnitInputName, ResourceSize.custom);
    }
  }, [cpu, setValue]);

  useEffect(() => {
    if (
      resourceSizePerUnit !== ResourceSize.custom &&
      disk !== DEFAULT_SIZES[resourceSizePerUnit].disk
    ) {
      setValue(resourceSizePerUnitInputName, ResourceSize.custom);
    }
  }, [disk, setValue]);

  useEffect(() => {
    if (
      resourceSizePerUnit !== ResourceSize.custom &&
      memory !== DEFAULT_SIZES[resourceSizePerUnit].memory
    ) {
      setValue(resourceSizePerUnitInputName, ResourceSize.custom);
    }
  }, [memory, setValue]);

  return (
    <FormGroup sx={{ mt: 3 }}>
      <Stack>
        <ToggleButtonGroupInput
          name={numberOfUnitsInputName}
          label={`Number of ${unitPlural}`}
          toggleButtonGroupProps={{
            onChange: (_, value) => {
              if (value !== CUSTOM_NR_UNITS_INPUT_VALUE) {
                resetField(customNrOfUnitsInputName, {
                  keepError: false,
                });
              }
            },
          }}
        >
          {options.map((value) => (
            <ToggleCard
              value={value}
              data-testid={`toggle-button-${unitPlural}-${value}`}
              key={value}
            >
              {`${value} ${+value > 1 ? unitPlural : unit}`}
            </ToggleCard>
          ))}
          <ToggleCard value={CUSTOM_NR_UNITS_INPUT_VALUE}>Custom</ToggleCard>
        </ToggleButtonGroupInput>
        {numberOfUnits === CUSTOM_NR_UNITS_INPUT_VALUE && (
          <TextInput
            name={customNrOfUnitsInputName}
            textFieldProps={{
              type: 'number',
              sx: {
                width: `${100 / (options.length + 1)}%`,
                alignSelf: 'flex-end',
                mt: 1,
              },
            }}
          />
        )}
      </Stack>
      <ToggleButtonGroupInput
        name={resourceSizePerUnitInputName}
        label={`Resource size per ${unit}`}
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
          unit={unit}
          unitPlural={unitPlural}
          name={cpuInputName}
          label="CPU"
          helperText={checkResourceText(
            resourcesInfo?.available?.cpuMillis,
            'CPU',
            'cpu',
            cpuCapacityExceeded
          )}
          endSuffix="CPU"
          numberOfUnits={intNumberOfUnits}
        />
        <ResourceInput
          unit={unit}
          unitPlural={unitPlural}
          name={memoryInputName}
          label="MEMORY"
          helperText={checkResourceText(
            resourcesInfo?.available?.memoryBytes,
            'GB',
            'memory',
            memoryCapacityExceeded
          )}
          endSuffix="GB"
          numberOfUnits={intNumberOfUnits}
        />
        <ResourceInput
          unit={unit}
          unitPlural={unitPlural}
          name={diskInputName}
          disabled={disableDiskInput}
          label="DISK"
          helperText={checkResourceText(
            resourcesInfo?.available?.diskSize,
            'GB',
            'disk',
            diskCapacityExceeded
          )}
          endSuffix="GB"
          numberOfUnits={intNumberOfUnits}
        />
      </Box>
    </FormGroup>
  );
};

const CustomAccordionSummary = ({
  unitPlural,
  nr,
}: {
  unitPlural: string;
  nr: number;
}) => {
  const text = Number.isNaN(nr) || nr < 1 ? '' : ` (${nr})`;

  return (
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography
        variant="h5"
        textTransform="capitalize"
      >{`${unitPlural} ${text}`}</Typography>
    </AccordionSummary>
  );
};

const ResourcesForm = ({
  dbType,
  disableDiskInput,
  allowDiskInputUpdate,
}: {
  dbType: DbType;
  disableDiskInput?: boolean;
  allowDiskInputUpdate?: boolean;
}) => {
  const [expanded, setExpanded] = useState<'nodes' | 'proxies' | false>(
    'nodes'
  );
  const { watch, getFieldState, setValue } = useFormContext();
  const numberOfNodes: string = watch(DbWizardFormFields.numberOfNodes);
  const numberOfProxies: string = watch(DbWizardFormFields.numberOfProxies);
  const customNrOfNodes: string = watch(DbWizardFormFields.customNrOfNodes);
  const customNrOfProxies: string = watch(DbWizardFormFields.customNrOfProxies);
  const proxyUnitNames = getProxyUnitNamesFromDbType(dbType);
  const nodesAccordionSummaryNumber =
    numberOfNodes === CUSTOM_NR_UNITS_INPUT_VALUE
      ? customNrOfNodes
      : numberOfNodes;
  const proxiesAccordionSummaryNumber =
    numberOfProxies === CUSTOM_NR_UNITS_INPUT_VALUE
      ? customNrOfProxies
      : numberOfProxies;

  const handleAccordionChange =
    (panel: 'nodes' | 'proxies') =>
    (_: React.SyntheticEvent, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : false);
    };

  useEffect(() => {
    const { isDirty: numberOfProxiesDirty } = getFieldState(
      DbWizardFormFields.numberOfProxies
    );

    if (numberOfProxiesDirty) {
      return;
    }

    if (NODES_DB_TYPE_MAP[dbType].includes(numberOfNodes)) {
      setValue(DbWizardFormFields.numberOfProxies, numberOfNodes);
    } else {
      setValue(DbWizardFormFields.numberOfProxies, CUSTOM_NR_UNITS_INPUT_VALUE);
      setValue(DbWizardFormFields.customNrOfProxies, customNrOfNodes);
    }
  }, [setValue, getFieldState, customNrOfNodes, dbType, numberOfNodes]);

  return (
    <>
      <Accordion
        expanded={expanded === 'nodes'}
        onChange={handleAccordionChange('nodes')}
        sx={{
          px: 2,
        }}
      >
        <CustomAccordionSummary
          unitPlural="Nodes"
          nr={parseInt(nodesAccordionSummaryNumber, 10)}
        />
        <Divider />
        <ResourcesToggles
          options={NODES_DB_TYPE_MAP[dbType]}
          resourceSizePerUnitInputName={DbWizardFormFields.resourceSizePerNode}
          cpuInputName={DbWizardFormFields.cpu}
          diskInputName={DbWizardFormFields.disk}
          memoryInputName={DbWizardFormFields.memory}
          numberOfUnitsInputName={DbWizardFormFields.numberOfNodes}
          customNrOfUnitsInputName={DbWizardFormFields.customNrOfNodes}
          disableDiskInput={disableDiskInput}
          allowDiskInputUpdate={allowDiskInputUpdate}
        />
      </Accordion>
      <Accordion
        expanded={expanded === 'proxies'}
        onChange={handleAccordionChange('proxies')}
        sx={{
          px: 2,
        }}
      >
        <CustomAccordionSummary
          unitPlural={proxyUnitNames.plural}
          nr={parseInt(proxiesAccordionSummaryNumber, 10)}
        />
        <Divider />
        <ResourcesToggles
          unit={proxyUnitNames.singular}
          unitPlural={proxyUnitNames.plural}
          options={NODES_DB_TYPE_MAP[dbType]}
          resourceSizePerUnitInputName={DbWizardFormFields.resourceSizePerProxy}
          cpuInputName={DbWizardFormFields.proxyCpu}
          diskInputName={DbWizardFormFields.proxyDisk}
          memoryInputName={DbWizardFormFields.proxyMemory}
          numberOfUnitsInputName={DbWizardFormFields.numberOfProxies}
          customNrOfUnitsInputName={DbWizardFormFields.customNrOfProxies}
        />
      </Accordion>
    </>
  );
};

export default ResourcesForm;
