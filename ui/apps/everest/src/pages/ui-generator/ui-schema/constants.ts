import { Checkbox } from '@mui/material';
import { TextInput } from '@percona/ui-lib';
import { OpenAPIObject } from './types';
import { z } from 'zod';

export const zodRuleMap: Record<string, string> = {
  min: 'min',
  max: 'max',
  minLength: 'min',
  maxLength: 'max',
  length: 'length',
  email: 'email',
  url: 'url',
  regex: 'regex',
  startsWith: 'startsWith',
  endsWith: 'endsWith',
  includes: 'includes',
  uuid: 'uuid',
};

export const muiComponentMap: Record<string, React.ElementType> = {
  Number: TextInput,
  Switch: TextInput,
  Checkbox: Checkbox,
  TextArea: TextInput,
  StorageClassSelect: TextInput,
  Toggle: TextInput,
};

export const UI_TYPE_DEFAULT_VALUE: Record<string, unknown> = {
  Number: 10,
  Switch: false,
  Checkbox: false,
  Toggle: false,
  TextArea: 'lorem ipsum',
  Input: '',
  StorageClassSelect: 'lorem ipsum',
  SecretSelector: '',
  String: '',
};

export const ZOD_SCHEMA_MAP: Record<string, z.ZodTypeAny> = {
  Number: z.union([z.string().min(1), z.number()]).pipe(
    z.coerce.number({
      invalid_type_error: 'Please enter a valid number',
    })
  ),
  String: z.string().min(5),
  TextArea: z.string().min(5),
  Input: z.string(),
  Switch: z.boolean(),
  Checkbox: z.boolean(),
};

export const openApiObj: OpenAPIObject = {
  global: {
    allowUnsafeFlags: {
      uiType: 'Toggle',
      label: 'Unsafe Flags',
      description: 'Allow unsafe flags to be set',
    },
  },
  components: {
    mongod: {
      // replicas: {
      //   validation: {
      //     min: 1,
      //     max: 99,
      //   },
      //   uiType: 'Number',
      //   description: 'Number of replica nodes',
      //   params: {
      //     label: 'Replicas',
      //     placeholder: '',
      //     default: '9999',
      //   },
      // },
      // storage: {
      //   uiType: 'Group',
      //   description: 'Storage configuration for the Mongod component',
      //   params: {
      //     label: 'Storage',
      //   },
      //   subParameters: {
      //     class: {
      //       uiType: 'StorageClassSelect',
      //       description: 'Storage class for the Mongod component',
      //       params: {
      //         label: 'Storage Class',
      //       },
      //     },
      //     size: {
      //       uiType: 'Number',
      //       description: 'Size of the storage',
      //       params: {
      //         label: 'Size',
      //         badge: 'Gi',
      //         options: [
      //           { label: '10Gi', value: '10Gi' },
      //           { label: '20Gi', value: '20Gi' },
      //           { label: '30Gi', value: '30Gi' },
      //         ],
      //       },
      //     },
      //   },
      // },
      resources: {
        uiType: 'Group',
        label: 'Resource Requests & Limits',
        description: 'Resource requests and limits for the Mongod component',
        subParameters: {
          requests: {
            uiType: 'Group',
            label: 'Requests',
            subParameters: {
              cpu_group: {
                uiType: 'Group',
                params: {
                  badge: 'Cores',
                  label: 'CPU',
                },
                subParameters: {
                  cpu1: {
                    uiType: 'Group',
                    params: {
                      badge: 'Cores',
                      label: 'CPU1',
                    },
                    description: 'CPU Limits',
                    subParameters: {
                      cpu1: {
                        uiType: 'Number',
                        params: {
                          badge: 'Cores',
                          label: 'CPU1',
                        },
                        description: 'CPU Limits',
                      },
                      memory1: {
                        uiType: 'Number',
                        params: {
                          badge: 'Gi',
                          label: 'Memory1',
                        },
                        description: 'Memory Requests',
                      },
                    },
                  },
                  memory1: {
                    uiType: 'Number',
                    params: {
                      badge: 'Gi',
                      label: 'Memory1',
                    },
                    description: 'Memory Requests',
                  },
                },
                description: 'CPU Requests',
              },
              memory: {
                uiType: 'Number',
                params: {
                  badge: 'Gi',
                  label: 'Memory',
                },
                description: 'Memory Requests',
              },
            },
          },
          requests1: {
            uiType: 'Number',
            label: 'Requests1',
            validation: {
              celExpr:
                'components.mongod.resources.requests1 >= 10 && components.mongod.resources.requests2 < 4',
            },
          },
          requests2: {
            uiType: 'Number',
            label: 'Requests2',
            validation: {
              celExpr:
                'components.mongod.resources.limits.cpu >= 10 && components.mongod.resources.requests2 < 4',
            },
          },
          // requests3: {
          //   uiType: 'Number',
          //   label: 'Requests2',
          // },
          // requests24: {
          //   uiType: 'Number',
          //   label: 'Requests2',
          // },
          // requests25: {
          //   uiType: 'Number',
          //   label: 'Requests2',
          // },
          // requests26: {
          //   uiType: 'Number',
          //   label: 'Requests2',
          // },
          limits: {
            uiType: 'Group',
            label: 'Limits',
            subParameters: {
              cpu: {
                uiType: 'Number',
                params: {
                  badge: 'Cores',
                  label: 'CPU',
                },
                description: 'CPU Limits',
              },
              memory: {
                uiType: 'Number',
                params: {
                  badge: 'Gi',
                  label: 'Memory',
                },
                description: 'Memory Limits',
              },
            },
          },
        },
      },
      // config: {
      //   uiType: 'TextArea',
      //   description: 'Configuration for MongoDB',
      //   params: {
      //     label: 'MongoDB Configuration',
      //   },
      // },
      // service: {
      //   uiType: 'Group',
      //   params: {
      //     label: 'Service settings',
      //   },
      //   description: 'Configuration for Mongod service',
      //   subParameters: {
      //     expose: {
      //       uiType: 'Switch',
      //       params: {
      //         label: 'Expose service',
      //         options: [
      //           { label: 'ClusterIP', value: 'ClusterIP' },
      //           { label: 'NodePort', value: 'NodePort' },
      //           { label: 'LoadBalancer', value: 'LoadBalancer' },
      //         ],
      //       },
      //       description: 'Expose the Mongod service',
      //     },
      //   },
      // },
    },
    backup: {
      replicas: { uiType: 'Hidden' },
      service: { uiType: 'Hidden' },
      storage: { uiType: 'Hidden' },
      resources: {
        uiType: 'Group',
        params: { label: 'Resource Requests & Limits' },
        description: 'Resource requests and limits for the Mongod component',
        subParameters: {
          requests: {
            uiType: 'Group',
            label: 'Requests',
            subParameters: {
              cpu: {
                uiType: 'Number',
                params: { badge: 'Cores', label: 'CPU' },
                description: 'CPU Requests',
              },
              memory: {
                uiType: 'Number',
                params: { badge: 'Gi', label: 'Memory' },
                description: 'Memory Requests',
              },
            },
          },
          limits: {
            uiType: 'Group',
            label: 'Limits',
            subParameters: {
              cpu: {
                uiType: 'Number',
                params: { badge: 'Cores', label: 'CPU' },
                description: 'CPU Limits',
              },
              memory: {
                uiType: 'Number',
                params: { badge: 'Gi', label: 'Memory' },
                description: 'Memory Limits',
              },
            },
          },
        },
      },
    },
    pmm: {
      replicas: { uiType: 'Hidden' },
      service: { uiType: 'Hidden' },
      storage: { uiType: 'Hidden' },
      resources: {
        uiType: 'Group',
        params: { label: 'Resource Requests & Limits' },
        description: 'Resource requests and limits for the Mongod component',
        subParameters: {
          requests: {
            uiType: 'Group',
            label: 'Requests',
            subParameters: {
              cpu: {
                uiType: 'Number',
                params: { badge: 'Cores', label: 'CPU' },
                description: 'CPU Requests',
              },
              memory: {
                uiType: 'Number',
                params: { badge: 'Gi', label: 'Memory' },
                description: 'Memory Requests',
              },
            },
          },
          limits: {
            uiType: 'Group',
            label: 'Limits',
            subParameters: {
              cpu: {
                uiType: 'Number',
                params: { badge: 'Cores', label: 'CPU' },
                description: 'CPU Limits',
              },
              memory: {
                uiType: 'Number',
                params: { badge: 'Gi', label: 'Memory' },
                description: 'Memory Limits',
              },
            },
          },
        },
      },
      serverHost: {
        uiType: 'Number',
        params: { label: 'PMM Server Host' },
        description: 'PMM Server Host',
      },
      credentialSecretName: {
        uiType: 'Number',
        params: { label: 'PMM Credential Secret Name' },
        description: 'PMM Credential Secret Name',
      },
    },
  },
  topologySchema: {
    standard: {},
    sharded: {
      shards: {
        uiType: 'Number',
        params: { label: 'Shards Per Node' },
        description: 'Number of shards per node',
        validation: { min: 1, max: 99 },
      },
    },
  },
};
