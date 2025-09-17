import {
  Accordion,
  AccordionDetails,
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Typography,
} from '@mui/material';
import { Stepper } from '@percona/ui-lib';
import { useState } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import {
  OpenAPIFields,
  OpenAPIObject,
  ComponentProperties,
  OpenAPIObjectProperties,
} from './types';
import { CustomAccordionSummary, SelectInput } from '@percona/ui-lib';
import React from 'react';
import {
  buildZodSchema,
  getDefaultValues,
  useTriggerDependentFields,
} from './utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { muiComponentMap, openApiObj } from './constants';
import { DatabaseSummary } from './summary/db-summary';
import DatabaseFormStepControllers from 'pages/database-form/database-form-body/DatabaseFormStepControllers';

const parseOpenAPIObject = (openApiObj: OpenAPIObject): OpenAPIFields => {
  const fields = {
    global: {},
    components: {},
    topology: {},
  };

  if (typeof openApiObj !== 'object' || openApiObj === null) {
    throw new Error('Invalid OpenAPI object');
  }

  if (openApiObj) {
    const globalSchema = openApiObj.global;
    fields.global = globalSchema || {};

    if (openApiObj.components) {
      Object.entries(openApiObj.components).forEach(
        ([componentName, componentSchema]) => {
          fields.components = {
            ...fields.components,
            ...{ [componentName]: componentSchema || {} },
          };
        }
      );
    }
    if (openApiObj.topologySchema) {
      fields.topology = openApiObj.topologySchema;
    }
  }

  return fields;
};

const OpenApiUiComponent = ({
  name,
  uiType,
  params,
  label,
  sx,
}: {
  name: string;
  params: OpenAPIObjectProperties;
  uiType: string;
  label: string;
  sx?: object;
}) => {
  const methods = useFormContext();
  const errors = methods?.formState?.errors || {};
  const error = errors[name]?.message as string | undefined;

  const Component = muiComponentMap[uiType];
  if (!Component) return null;

  const { badge, ...restParams } = params || {};

  const options = params.options
    ? params.options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))
    : undefined;

  return (
    <Box>
      <Box display="flex" alignItems="center">
        {React.createElement(
          Component,
          {
            ...restParams,
            label: label,
            name: name,
            error: !!error,
            formControlProps: { sx: { minWidth: '450px', marginTop: '15px' } },
            textFieldProps: {
              sx: { width: 240, ...sx },
              ...(badge
                ? {
                    InputProps: {
                      label: label,
                      endAdornment: (
                        <InputAdornment position="end">{badge}</InputAdornment>
                      ),
                    },
                  }
                : {}),
            },
          },
          options
        )}
      </Box>
      {error && (
        <Typography color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

function renderComponentGroup({
  name,
  properties,
  isTopLevel = false,
  siblings = [],
}: {
  name: string;
  properties: ComponentProperties;
  isTopLevel?: boolean;
  siblings?: ComponentProperties[];
}): React.ReactNode {
  const fieldName = name;
  const label = properties.params?.label || properties.label || name;
  const isGroup = properties.uiType === 'Group' && !!properties.subParameters;

  const hasGroupSibling = siblings.some(
    (sib) => sib.uiType === 'Group' && !!sib.subParameters
  );

  const nestingLevel = fieldName.split('.').length;

  const children = isGroup ? (
    Object.entries(properties.subParameters!).map(([subName, subProps]) => {
      const subSiblings = Object.values(properties.subParameters!);
      return renderComponentGroup({
        name: `${fieldName}.${subName}`,
        properties: subProps,
        siblings: subSiblings,
      });
    })
  ) : hasGroupSibling || isTopLevel || nestingLevel <= 4 ? (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      sx={{
        width: '100%',
        flex: 1,
        justifyContent: 'space-between',
        padding: '0 10px 0 15px',
        alignItems: 'baseline',
      }}
    >
      <Typography sx={{ fontWeight: '600', color: '#303642' }}>
        {label}
      </Typography>
      <OpenApiUiComponent
        key={fieldName}
        name={fieldName}
        uiType={properties.uiType!}
        params={properties.params || {}}
        label=""
        sx={{ width: '450px' }}
      />
    </Box>
  ) : (
    <OpenApiUiComponent
      key={fieldName}
      name={fieldName}
      uiType={properties.uiType!}
      params={properties.params || {}}
      label={label}
      sx={{ width: '350px', height: '70px' }}
    />
  );

  const shouldRenderAccordion = isTopLevel || (isGroup && isTopLevel);
  if (shouldRenderAccordion) {
    return (
      <Accordion key={fieldName} defaultExpanded>
        <CustomAccordionSummary title={label} />
        <AccordionDetails style={{ display: 'flex', flexDirection: 'column' }}>
          {children}
        </AccordionDetails>
      </Accordion>
    );
  } else if (isGroup) {
    return (
      <Box
        sx={{
          border: '1px solid #2C323E40',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          padding: '25px',
          margin: '5px',
          marginTop: '20px',
        }}
      >
        <Typography sx={{ fontWeight: '600', color: '#303642' }}>
          {label}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 2,
            padding: '15px',
            alignItems: 'center',
          }}
        >
          {children}
        </Box>
      </Box>
    );
  }

  return <Box>{children}</Box>;
}

export const UIGeneratorNew = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTopology, setSelectedTopology] = useState<string>('');
  const fields = parseOpenAPIObject(openApiObj);
  const { global, components, topology } = fields;

  const stepLabels = [
    'Topology',
    'Globals',
    ...Object.keys(components).map((name) => `Component: ${name}`),
  ];

  let selectedData = {};
  let parent = '';
  if (activeStep === 0 && selectedTopology && topology[selectedTopology]) {
    selectedData = topology[selectedTopology];
    parent = `topology.${selectedTopology}`;
  } else if (activeStep === 1) {
    selectedData = global;
    parent = 'global.params';
  } else if (activeStep > 1) {
    selectedData = components[Object.keys(components)[activeStep - 2]];
    parent = `components.${Object.keys(components)[activeStep - 2]}`;
  }

  const groupedComponents = Object.entries(selectedData).reduce(
    (acc, [key, value]) => {
      const componentValue = value as ComponentProperties;
      if (componentValue.uiType !== 'Hidden') {
        acc[key] = componentValue;
      }
      return acc;
    },
    {} as Record<string, ComponentProperties>
  );

  const { schema, celDependencyGroups } = buildZodSchema(
    groupedComponents,
    parent
  );

  const defaultValues = getDefaultValues(fields);

  const methods = useForm({
    mode: 'onChange',
    resolver: async (data, context, options) => {
      const customResolver = zodResolver(schema);
      const result = await customResolver(data, context, options);
      return result;
    },
    defaultValues,
  });

  // watch all fields that contain dependencies
  const { trigger, control } = methods;
  useTriggerDependentFields(celDependencyGroups, control, trigger);

  const onSubmit = (data: Record<string, unknown>): void => {
    console.log('🚀 ~ onSubmit ~ data:', data);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <FormProvider {...methods}>
        <Box sx={{ width: '60%' }}>
          <Stepper noConnector activeStep={activeStep} sx={{ marginBottom: 4 }}>
            {stepLabels.map((_, idx) => (
              <Step key={`step-${idx + 1}`}>
                <StepLabel />
              </Step>
            ))}
          </Stepper>
          <Stack spacing={2} sx={{ marginTop: 2 }}>
            <Typography variant="h5">{stepLabels[activeStep]}</Typography>
            {activeStep === 0 ? (
              <Box sx={{ width: '100%' }}>
                <SelectInput
                  name="topology.type"
                  label="Topology Type"
                  selectFieldProps={{ sx: { width: '400px' } }}
                >
                  {Object.keys(topology).map((topKey) => (
                    <MenuItem
                      value={topKey}
                      key={topKey}
                      onClick={() => setSelectedTopology(topKey)} //TODO: set defaults for topology after selection
                    >
                      {topKey}
                    </MenuItem>
                  ))}
                </SelectInput>
                {selectedTopology && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {Object.entries(topology[selectedTopology]).map(
                      ([groupName, groupProperties]) => {
                        const siblings = Object.values(
                          topology[selectedTopology]
                        ) as ComponentProperties[];
                        return renderComponentGroup({
                          name: `topology.${selectedTopology}.${groupName}`,
                          properties: groupProperties as ComponentProperties,
                          isTopLevel: true,
                          siblings,
                        });
                      }
                    )}
                  </Stack>
                )}
              </Box>
            ) : (
              <Box>
                {Object.entries(groupedComponents).map(
                  ([groupName, groupProperties]) => {
                    if (
                      typeof groupProperties === 'object' &&
                      groupProperties !== null &&
                      'uiType' in groupProperties
                    ) {
                      const siblings = Object.values(
                        groupedComponents
                      ) as ComponentProperties[];
                      return renderComponentGroup({
                        name: `${parent}.${groupName}`,
                        properties: groupProperties,
                        isTopLevel: true,
                        siblings,
                      });
                    }
                    return null;
                  }
                )}
              </Box>
            )}
          </Stack>
          <Button
            onClick={() => onSubmit(methods.getValues())}
            disabled={
              activeStep !== stepLabels.length - 1 ||
              Object.keys(methods.formState.errors).length > 0
            }
          >
            Test Submit
          </Button>
          <DatabaseFormStepControllers
            disableBack={activeStep === 0}
            disableSubmit={
              activeStep !== stepLabels.length - 1 ||
              Object.keys(methods.formState.errors).length > 0
            }
            showSubmit={activeStep === stepLabels.length - 1}
            onPreviousClick={() => setActiveStep((prev) => prev - 1)}
            onNextClick={() => setActiveStep((prev) => prev + 1)}
            onSubmit={() => {}}
            onCancel={() => {}}
          />
        </Box>
        <DatabaseSummary fields={fields} setActiveStep={setActiveStep} />
      </FormProvider>
    </Box>
  );
};
