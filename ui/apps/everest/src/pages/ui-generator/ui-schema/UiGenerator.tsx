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
  Stepper,
  Typography,
} from '@mui/material';
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
import { buildZodSchema, getDefaultValues } from './utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { muiComponentMap, openApiObj } from './constants';

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
}: {
  name: string;
  params: OpenAPIObjectProperties;
  uiType: string;
  label: string;
}) => {
  const methods = useFormContext();
  const errors = methods?.formState?.errors || {};
  const error = errors[name]?.message as string | undefined;

  const Component = muiComponentMap[uiType];
  if (!Component) return null;

  const { badge, ...restParams } = params || {};

  return (
    <Box>
      <Box display="flex" alignItems="center">
        {React.createElement(Component, {
          ...restParams,
          label: label,
          name: name,
          error: !!error,
          style: { width: 240 },
          textFieldProps: {
            sx: { width: 240 },
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
        })}
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

  const children = isGroup ? (
    Object.entries(properties.subParameters!).map(([subName, subProps]) => {
      const subSiblings = Object.values(properties.subParameters!);
      return renderComponentGroup({
        name: `${fieldName}.${subName}`,
        properties: subProps,
        siblings: subSiblings,
      });
    })
  ) : hasGroupSibling || isTopLevel ? (
    <Box display="flex" alignItems="center" gap={1}>
      <Typography sx={{ fontWeight: 500, mb: 0 }}>{label}</Typography>
      <OpenApiUiComponent
        key={fieldName}
        name={fieldName}
        uiType={properties.uiType!}
        params={properties.params || {}}
        label=""
      />
    </Box>
  ) : (
    <OpenApiUiComponent
      key={fieldName}
      name={fieldName}
      uiType={properties.uiType!}
      params={properties.params || {}}
      label={label}
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
          padding: '15px',
          margin: '5px',
          width: '100%',
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

  const schema = buildZodSchema(groupedComponents, parent);

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

  const onSubmit = (data: Record<string, unknown>) => {
    console.log('🚀 ~ onSubmit ~ data:', data);
  };

  return (
    <>
      <FormProvider {...methods}>
        <div>
          <Stepper activeStep={activeStep} sx={{ marginBottom: 4 }}>
            {stepLabels.map((label) => (
              <Step key={label} completed={false}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Stack spacing={2} sx={{ marginTop: 2 }}>
            <Typography variant="h5">{stepLabels[activeStep]}</Typography>
            {activeStep === 0 ? (
              <>
                <SelectInput name="topology" label="Topology Type">
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
                          name: groupName,
                          properties: groupProperties as ComponentProperties,
                          isTopLevel: true,
                          siblings,
                        });
                      }
                    )}
                  </Stack>
                )}
              </>
            ) : (
              Object.entries(groupedComponents).map(
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
              )
            )}
          </Stack>
          <Stack direction={'row'} spacing={2} sx={{ marginTop: 2 }}>
            <Button
              onClick={() => setActiveStep((prev) => prev - 1)}
              disabled={activeStep === 0}
            >
              Previous
            </Button>
            <Button
              onClick={() => setActiveStep((prev) => prev + 1)}
              disabled={activeStep === stepLabels.length - 1}
            >
              Next
            </Button>
          </Stack>
        </div>
        <Button
          onClick={() => onSubmit(methods.getValues())}
          disabled={
            activeStep !== stepLabels.length - 1
            // || Object.keys(methods.formState.errors).length > 0
          }
        >
          Submit
        </Button>
      </FormProvider>
    </>
  );
};
