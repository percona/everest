import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { OpenAPIFields, OpenAPIObject, ComponentProperties } from './types';
import { SelectInput } from '@percona/ui-lib';
import React from 'react';
import { buildZodSchema, getDefaultValues } from './utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { muiComponentMap, openApiObj } from './constants';

const parseOpenAPIObject = (openApiObj: OpenAPIObject): OpenAPIFields => {
  const fields = {
    global: { properties: {} },
    components: {},
    topology: {},
  };

  if (typeof openApiObj !== 'object' || openApiObj === null) {
    throw new Error('Invalid OpenAPI object');
  }

  if (openApiObj) {
    const globalSchema = openApiObj.global;
    fields.global.properties = globalSchema || {};

    if (openApiObj.components) {
      Object.entries(openApiObj.components).forEach(
        ([componentName, componentSchema]) => {
          fields.components[componentName] = {
            name: componentName,
            properties: {
              ...(componentSchema || {}),
            },
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
  subParameters,
}: {
  name: string;
  params: ComponentProperties;
  uiType: string;
  subParameters?: unknown;
}) => {
  const methods = useFormContext();
  const errors = methods?.formState?.errors || {};
  const error = errors[name]?.message as string | undefined;

  if (uiType === 'Group') {
    {
      Object.entries(subParameters as Record<string, ComponentProperties>).map(
        ([groupName, groupProperties]) => {
          return (
            <Accordion key={groupName}>
              <AccordionSummary>
                <Typography variant="h6">{groupName}</Typography>
              </AccordionSummary>
              <AccordionDetails
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                {Object.entries(
                  groupProperties as Record<string, ComponentProperties>
                ).map(([subGroupName, subGroupProperties]) => (
                  <OpenApiUiComponent
                    key={subGroupName}
                    name={subGroupName}
                    params={subGroupProperties.params || {}}
                    uiType={subGroupProperties.uiType!}
                    subParameters={subGroupProperties.subParameters}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          );
        }
      );
    }
  }
  const Component = muiComponentMap[uiType];
  if (!Component) return null;

  return (
    <>
      {React.createElement(Component, {
        label: name,
        name: name,
        error: !!error,
        style: { minWidth: 240 },
        ...params,
      })}
      {error && <Typography>{error}</Typography>}
      {/* {params.badge!! && <Typography>{params.badge}</Typography>} */}
    </>
  );
};

function renderComponentGroup({
  name,
  properties,
  isTopLevel = false,
}: {
  name: string;
  properties: ComponentProperties;
  parentName?: string;
  isTopLevel?: boolean;
}): React.ReactNode {
  const fieldName = name;
  const label = properties.params?.label || properties.label || name;
  const isGroup = properties.uiType === 'Group' && properties.subParameters;
  const children = isGroup ? (
    Object.entries(properties.subParameters!).map(([subName, subProps]) => {
      return renderComponentGroup({
        name: `${fieldName}.${subName}`,
        properties: subProps,
        parentName: fieldName,
      });
    })
  ) : (
    <OpenApiUiComponent
      key={fieldName}
      name={fieldName}
      uiType={properties.uiType!}
      subParameters={properties.subParameters}
      params={properties.params || {}}
    />
  );

  if (isTopLevel) {
    return (
      <Accordion key={fieldName}>
        <AccordionSummary>
          <Typography variant="h6">{label}</Typography>
        </AccordionSummary>
        <AccordionDetails style={{ display: 'flex', flexDirection: 'column' }}>
          {children}
        </AccordionDetails>
      </Accordion>
    );
  }

  return <>{children}</>;
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
    selectedData = global.properties;
    parent = 'global.params';
  } else if (activeStep > 1) {
    selectedData =
      components[Object.keys(components)[activeStep - 2]].properties;
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

  const defaultValues = getDefaultValues(
    groupedComponents,
    Object.keys(topology),
    parent
  );
  console.log('🚀 ~ UIGeneratorNew ~ defaultValues:', defaultValues);

  const methods = useForm({
    mode: 'onChange',
    // resolver: zodResolver(schema),
    resolver: async (data, context, options) => {
      const customResolver = zodResolver(schema);
      const result = await customResolver(data, context, options);
      // if (Object.keys(result.errors).length > 0) {
      //   setStepsWithErrors((prev) => {
      //     if (!prev.includes(activeStep)) {
      //       return [...prev, activeStep];
      //     }
      //     return prev;
      //   });
      // } else {
      //   setStepsWithErrors((prev) =>
      //     prev.filter((step) => step !== activeStep)
      //   );
      // }
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
                      onClick={() => setSelectedTopology(topKey)}
                    >
                      {topKey}
                    </MenuItem>
                  ))}
                </SelectInput>
                {selectedTopology && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {Object.entries(topology[selectedTopology]).map(
                      ([groupName, groupProperties]) => {
                        return renderComponentGroup({
                          name: groupName,
                          properties: groupProperties,
                          isTopLevel: true,
                        });
                      }
                    )}
                  </Stack>
                )}
              </>
            ) : (
              Object.entries(groupedComponents).map(
                ([groupName, groupProperties]) => {
                  return renderComponentGroup({
                    name: `${parent}.${groupName}`,
                    properties: groupProperties,
                    isTopLevel: true,
                  });
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
