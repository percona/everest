import { zodResolver } from '@hookform/resolvers/zod';
import {
  Step,
  Typography,
  StepLabel,
  Stack,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  MenuItem,
} from '@mui/material';
import { SelectInput, Stepper, TextInput } from '@percona/ui-lib';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

type OpenAPIObjectProperties = {
  type: string;
  enum?: string[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  format?: string;
  description?: string;
  'x-group'?: string;
  required?: boolean;
};

type OpenAPIObject = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    schemas: {
      global: {
        openAPIV3Schema: {
          type: string;
          properties: { [key: string]: OpenAPIObjectProperties };
          required?: string[];
        };
      };
      components: {
        [key: string]: {
          openAPIV3Schema: {
            type: string;
            properties: { [key: string]: OpenAPIObjectProperties };
            required?: string[];
          };
        };
      };
    };
  };
};

type OpenAPIFields = {
  global: {
    properties: { [key: string]: OpenAPIObjectProperties };
  };
  components: {
    [key: string]: {
      properties: { [key: string]: OpenAPIObjectProperties };
    };
  };
};

const openApiObj: OpenAPIObject = {
  apiVersion: 'everest.percona.com/v1',
  kind: 'DatabaseClusterDefinition',
  metadata: {
    name: 'pxc-cluster-schema',
    namespace: 'everest-system',
  },
  spec: {
    schemas: {
      global: {
        openAPIV3Schema: {
          type: 'object',
          properties: {
            clusterName: {
              type: 'string',
              minLength: 3,
              maxLength: 5,
              pattern: '^[a-z0-9-]+$',
              description:
                'Name of the cluster (lowercase letters, numbers, hyphens)',
            },
            replicas: {
              type: 'integer',
              minimum: 1,
              maximum: 9,
              description: 'Number of replicas in the cluster',
            },
          },
          required: ['clusterName', 'replicas'],
        },
      },
      components: {
        engine: {
          openAPIV3Schema: {
            type: 'object',
            properties: {
              version: {
                type: 'string',
                pattern: '^\\d+\\.\\d+\\.\\d+$',
                description: 'Engine version (semantic versioning)',
              },
              storageSize: {
                type: 'string',
                pattern: '^\\d+Gi$',
                description: 'Persistent volume size (e.g. 10Gi)',
                'x-group': 'Group 1',
              },
            },
            required: ['version', 'storageSize'],
          },
        },
        haProxy: {
          openAPIV3Schema: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean',
                description: 'Whether HAProxy is enabled',
                'x-group': 'Group 1',
              },
              maxConnections: {
                type: 'integer',
                minimum: 10,
                maximum: 10000,
                description: 'Maximum number of allowed HAProxy connections',
                'x-group': 'Group 1',
              },
            },
            required: ['enabled'],
          },
        },
        logCollector: {
          openAPIV3Schema: {
            type: 'object',
            properties: {
              logLevel: {
                type: 'string',
                enum: ['debug', 'info', 'warn', 'error'],
                description: 'Logging level for the log collector',
                'x-group': 'Group 1',
              },
              retentionDays: {
                type: 'integer',
                minimum: 1,
                maximum: 30,
                description: 'How many days to retain logs',
                'x-group': 'Group 1',
              },
            },
            required: ['logLevel'],
          },
        },
        pmmClient: {
          openAPIV3Schema: {
            type: 'object',
            properties: {
              serverURL: {
                type: 'string',
                format: 'uri',
                description: 'PMM server endpoint',
              },
              enableMetrics: {
                type: 'boolean',
                description: 'Enable or disable metrics collection',
              },
            },
            required: ['serverURL'],
          },
        },
      },
    },
  },
};

const parseOpenAPIObject = (openApiObj: OpenAPIObject): OpenAPIFields => {
  const fields: OpenAPIFields = {
    global: { properties: {} },
    components: {},
  };

  if (typeof openApiObj !== 'object' || openApiObj === null) {
    throw new Error('Invalid OpenAPI object');
  }

  if (!('spec' in openApiObj)) {
    throw new Error('OpenAPI object does not contain spec');
  }

  if (!('schemas' in openApiObj.spec)) {
    throw new Error('OpenAPI object does not contain schemas');
  }

  if (openApiObj.spec && openApiObj.spec.schemas) {
    const globalSchema = openApiObj.spec.schemas.global.openAPIV3Schema;
    fields.global.properties = globalSchema.properties || {};

    if (openApiObj.spec.schemas.components) {
      Object.entries(openApiObj.spec.schemas.components).forEach(
        ([componentName, componentSchema]) => {
          fields.components[componentName] = {
            properties: {
              ...(componentSchema.openAPIV3Schema.properties || {}),
            },
          };
          const requiredFields = componentSchema.openAPIV3Schema.required || [];
          requiredFields.forEach((field) => {
            if (fields.components[componentName].properties[field]) {
              fields.components[componentName].properties[field].required =
                true;
            }
          });
        }
      );
    }
  }

  return fields;
};

const OpenApiUiComponent = ({
  name,
  properties,
}: {
  name: string;
  properties: OpenAPIObjectProperties;
}) => {
  const { description, type, ...rest } = properties;

  if (type === 'string') {
    if (rest.enum && Array.isArray(rest.enum)) {
      return (
        <SelectInput
          label={name}
          name={name}
          helperText={description}
          {...rest}
        >
          {rest.enum.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </SelectInput>
      );
    }

    return (
      <TextInput
        label={name}
        name={name}
        textFieldProps={{
          helperText: description,
          fullWidth: true,
        }}
        {...rest}
      />
    );
  }

  if (type === 'integer') {
    return (
      <TextInput
        label={name}
        name={name}
        textFieldProps={{
          helperText: description,
          type: 'number',
          fullWidth: true,
        }}
        {...rest}
      />
    );
  }

  if (type === 'boolean') {
    return <FormControlLabel control={<Checkbox />} label={name} />;
  }

  return null;
};

const openApiPropertyToZodFn = (
  property: OpenAPIObjectProperties
): z.ZodTypeAny => {
  if (property.type === 'string') {
    if (property.enum && Array.isArray(property.enum)) {
      return z.enum(property.enum);
    }

    let res = z.string();

    if (property.minLength !== undefined) {
      res = res.min(property.minLength);
    }
    if (property.maxLength !== undefined) {
      res = res.max(property.maxLength);
    }
    if (property.pattern) {
      res = res.regex(new RegExp(property.pattern));
    }
    if (property.format === 'uri') {
      res = res.url();
    }
    return res;
  }

  if (property.type === 'integer') {
    let res = z.coerce.number();

    if (property.minimum !== undefined) {
      res = res.min(property.minimum);
    }

    if (property.maximum !== undefined) {
      res = res.max(property.maximum);
    }

    return res;
  }

  if (property.type === 'boolean') {
    return z.boolean();
  }

  return z.any(); // Fallback for unsupported types
};

const getZodSchemaFromGroupedComponents = <T extends z.ZodRawShape>(
  properties: Record<string, OpenAPIObjectProperties>
): z.ZodObject<T> => {
  let zodSchema: z.ZodObject<T> = z.object({});

  Object.entries(properties).forEach(([propertyName, propertyObj]) => {
    const propertyType = openApiPropertyToZodFn(propertyObj);

    zodSchema = zodSchema.extend({
      [propertyName]: propertyType,
    });
  });

  return zodSchema;
};

export const UIGenerator = () => {
  const [activeStep, setActiveStep] = useState(0);
  const fields = parseOpenAPIObject(openApiObj);
  const { global, components } = fields;

  const selectedComponent =
    activeStep === 0
      ? global
      : components[Object.keys(components)[activeStep - 1]];

  const groupedComponents: Record<
    string,
    Record<string, OpenAPIObjectProperties>
  > = Object.entries(selectedComponent.properties).reduce(
    (acc, [key, value]) => {
      const group = value['x-group'] || 'Misc';
      if (!acc[group]) {
        acc[group] = {};
      }
      acc[group][key] = value;
      return acc;
    },
    {}
  );
  const schema = getZodSchemaFromGroupedComponents(
    Object.entries(groupedComponents).reduce((acc, [, groupProperties]) => {
      Object.entries(groupProperties).forEach(([propertyName, properties]) => {
        acc[propertyName] = properties;
      });
      return acc;
    }, {})
  );
  const methods = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: any) => {
    console.log('Form submitted with data:', data);
  };

  return (
    <FormProvider {...methods}>
      <div>
        <Stepper noConnector activeStep={activeStep} sx={{ marginBottom: 4 }}>
          <Step completed={false}>
            <StepLabel />
          </Step>
          {Object.entries(components).map(([componentName]) => (
            <Step key={componentName} completed={false}>
              <StepLabel />
            </Step>
          ))}
        </Stepper>
        <Stack spacing={2} sx={{ marginTop: 2 }}>
          <Typography variant="h5">
            {activeStep === 0
              ? 'Globals'
              : `Component: ${Object.keys(components)[activeStep - 1]}`}
          </Typography>
          {Object.entries(groupedComponents).map(
            ([groupName, groupProperties]) => (
              <Accordion key={groupName}>
                <AccordionSummary>
                  <Typography variant="h6">{groupName}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.entries(groupProperties).map(
                    ([propertyName, properties]) => (
                      <OpenApiUiComponent
                        key={propertyName}
                        name={propertyName}
                        properties={properties}
                      />
                    )
                  )}
                </AccordionDetails>
              </Accordion>
            )
          )}
        </Stack>
        <Stack direction={'row'} spacing={2} sx={{ marginTop: 2 }}>
          <Button
            onClick={() => setActiveStep((prev) => (prev > 0 ? prev - 1 : 0))}
          >
            Previous
          </Button>
          <Button
            onClick={() =>
              setActiveStep((prev) =>
                prev < Object.keys(components).length ? prev + 1 : prev
              )
            }
          >
            Next
          </Button>
        </Stack>
      </div>
      <Button onClick={() => methods.handleSubmit(onSubmit)()}>Submit</Button>
    </FormProvider>
  );
};
