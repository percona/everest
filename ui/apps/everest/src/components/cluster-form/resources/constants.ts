import { DbType } from '@percona/types';
import { z } from 'zod';
import { Resources } from 'shared-types/dbCluster.types';
import { DbWizardFormFields } from 'consts';
import { memoryParser } from 'utils/k8ResourceParser';
import { Messages } from './messages';

const resourceToNumber = (minimum = 0) =>
  z.union([z.string().min(1), z.number()]).pipe(
    z.coerce
      .number({
        invalid_type_error: 'Please enter a valid number',
      })
      .min(minimum)
  );

export const matchFieldsValueToResourceSize = (
  dbType: DbType,
  resources?: Resources
): ResourceSize => {
  if (!resources) {
    return ResourceSize.custom;
  }
  const memory = memoryParser(resources.memory.toString());

  const res = Object.values(NODES_DEFAULT_SIZES[dbType]).findIndex(
    (item) => item.cpu === Number(resources.cpu) && item.memory === memory.value
  );
  return res !== -1
    ? (Object.keys(NODES_DEFAULT_SIZES[dbType])[res] as ResourceSize)
    : ResourceSize.custom;
};

export const NODES_DB_TYPE_MAP: Record<DbType, string[]> = {
  [DbType.Mongo]: ['1', '3', '5'],
  [DbType.Mysql]: ['1', '3', '5'],
  [DbType.Postresql]: ['1', '2', '3'],
};

export enum ResourceSize {
  small = 'small',
  medium = 'medium',
  large = 'large',
  custom = 'custom',
}

export const humanizedResourceSizeMap: Record<ResourceSize, string> = {
  [ResourceSize.small]: 'Small',
  [ResourceSize.medium]: 'Medium',
  [ResourceSize.large]: 'Large',
  [ResourceSize.custom]: 'Custom',
};

export const NODES_DEFAULT_SIZES = {
  [DbType.Mysql]: {
    [ResourceSize.small]: {
      [DbWizardFormFields.cpu]: 1,
      [DbWizardFormFields.memory]: 2,
      [DbWizardFormFields.disk]: 25,
    },
    [ResourceSize.medium]: {
      [DbWizardFormFields.cpu]: 4,
      [DbWizardFormFields.memory]: 8,
      [DbWizardFormFields.disk]: 100,
    },
    [ResourceSize.large]: {
      [DbWizardFormFields.cpu]: 8,
      [DbWizardFormFields.memory]: 32,
      [DbWizardFormFields.disk]: 200,
    },
  },
  [DbType.Mongo]: {
    [ResourceSize.small]: {
      [DbWizardFormFields.cpu]: 1,
      [DbWizardFormFields.memory]: 4,
      [DbWizardFormFields.disk]: 25,
    },
    [ResourceSize.medium]: {
      [DbWizardFormFields.cpu]: 4,
      [DbWizardFormFields.memory]: 8,
      [DbWizardFormFields.disk]: 100,
    },
    [ResourceSize.large]: {
      [DbWizardFormFields.cpu]: 8,
      [DbWizardFormFields.memory]: 32,
      [DbWizardFormFields.disk]: 200,
    },
  },
  [DbType.Postresql]: {
    [ResourceSize.small]: {
      [DbWizardFormFields.cpu]: 1,
      [DbWizardFormFields.memory]: 2,
      [DbWizardFormFields.disk]: 25,
    },
    [ResourceSize.medium]: {
      [DbWizardFormFields.cpu]: 4,
      [DbWizardFormFields.memory]: 8,
      [DbWizardFormFields.disk]: 100,
    },
    [ResourceSize.large]: {
      [DbWizardFormFields.cpu]: 8,
      [DbWizardFormFields.memory]: 32,
      [DbWizardFormFields.disk]: 200,
    },
  },
};

export const PROXIES_DEFAULT_SIZES = {
  [DbType.Mysql]: {
    [ResourceSize.small]: {
      [DbWizardFormFields.cpu]: 0.2,
      [DbWizardFormFields.memory]: 0.2,
    },
    [ResourceSize.medium]: {
      [DbWizardFormFields.cpu]: 0.5,
      [DbWizardFormFields.memory]: 0.8,
    },
    [ResourceSize.large]: {
      [DbWizardFormFields.cpu]: 0.8,
      [DbWizardFormFields.memory]: 3,
    },
  },
  [DbType.Mongo]: {
    [ResourceSize.small]: {
      [DbWizardFormFields.cpu]: 1,
      [DbWizardFormFields.memory]: 2,
    },
    [ResourceSize.medium]: {
      [DbWizardFormFields.cpu]: 2,
      [DbWizardFormFields.memory]: 4,
    },
    [ResourceSize.large]: {
      [DbWizardFormFields.cpu]: 4,
      [DbWizardFormFields.memory]: 16,
    },
  },
  [DbType.Postresql]: {
    [ResourceSize.small]: {
      [DbWizardFormFields.cpu]: 1,
      [DbWizardFormFields.memory]: 0.03,
    },
    [ResourceSize.medium]: {
      [DbWizardFormFields.cpu]: 4,
      [DbWizardFormFields.memory]: 0.06,
    },
    [ResourceSize.large]: {
      [DbWizardFormFields.cpu]: 8,
      [DbWizardFormFields.memory]: 0.1,
    },
  },
};

export const SHARDING_DEFAULTS = {
  [DbWizardFormFields.shardConfigServers]: {
    min: '1',
    max: '7',
  },
  [DbWizardFormFields.shardNr]: {
    min: '1',
  },
};

export const resourcesFormSchema = (passthrough?: boolean) => {
  const objectShape = {
    [DbWizardFormFields.shardNr]: z.string().optional(),
    [DbWizardFormFields.shardConfigServers]: z.string().optional(),
    [DbWizardFormFields.cpu]: resourceToNumber(0.6),
    [DbWizardFormFields.memory]: resourceToNumber(0.512),
    [DbWizardFormFields.disk]: resourceToNumber(1),
    // we will never input this, but we need it and zod will let it pass
    [DbWizardFormFields.diskUnit]: z.string(),
    [DbWizardFormFields.memoryUnit]: z.string(),
    [DbWizardFormFields.proxyMemoryUnit]: z.string(),
    [DbWizardFormFields.resourceSizePerNode]: z.nativeEnum(ResourceSize),
    [DbWizardFormFields.numberOfNodes]: z.string(),
    [DbWizardFormFields.customNrOfNodes]: z.string().optional(),
    [DbWizardFormFields.proxyCpu]: resourceToNumber(0),
    [DbWizardFormFields.proxyMemory]: resourceToNumber(0),
    [DbWizardFormFields.resourceSizePerProxy]: z.nativeEnum(ResourceSize),
    [DbWizardFormFields.numberOfProxies]: z.string(),
    [DbWizardFormFields.customNrOfProxies]: z.string().optional(),
  };

  const zObject = passthrough
    ? z.object(objectShape).passthrough()
    : z.object(objectShape);

  return zObject.superRefine(
    (
      {
        sharding,
        shardConfigServers,
        shardNr,
        numberOfNodes,
        numberOfProxies,
        customNrOfNodes = '',
        customNrOfProxies = '',
      },
      ctx
    ) => {
      [
        [numberOfNodes, customNrOfNodes, DbWizardFormFields.customNrOfNodes],
        [
          numberOfProxies,
          customNrOfProxies,
          DbWizardFormFields.customNrOfProxies,
        ],
      ].forEach(([nr, customNr, path]) => {
        if (nr === CUSTOM_NR_UNITS_INPUT_VALUE) {
          const intNr = parseInt(customNr, 10);

          if (Number.isNaN(intNr) || intNr < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Please enter a valid number',
              path: [path],
            });
          }
        }
      });

      if (sharding as boolean) {
        const intShardNr = parseInt(shardNr || '', 10);
        const intShardNrMin =
          +SHARDING_DEFAULTS[DbWizardFormFields.shardNr].min;
        const intShardConfigServers = parseInt(shardConfigServers || '', 10);
        const intShardConfigServersMin =
          +SHARDING_DEFAULTS[DbWizardFormFields.shardNr].min;
        const intShardConfigServersMax =
          +SHARDING_DEFAULTS[DbWizardFormFields.shardConfigServers].max;

        if (Number.isNaN(intShardNr) || intShardNr < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: Messages.sharding.invalid,
            path: [DbWizardFormFields.shardNr],
          });
        } else {
          if (intShardNr < intShardNrMin) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: Messages.sharding.min(intShardNrMin),
              path: [DbWizardFormFields.shardNr],
            });
          }
        }

        if (Number.isNaN(intShardConfigServers) || intShardConfigServers <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: Messages.sharding.invalid,
            path: [DbWizardFormFields.shardConfigServers],
          });
        } else {
          if (intShardConfigServers < intShardConfigServersMin) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: Messages.sharding.min(intShardConfigServersMin),
              path: [DbWizardFormFields.shardConfigServers],
            });
          } else if (!(intShardConfigServers % 2)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: Messages.sharding.odd,
              path: [DbWizardFormFields.shardConfigServers],
            });
          } else if (intShardConfigServers > intShardConfigServersMax) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: Messages.sharding.max(intShardConfigServersMax),
              path: [DbWizardFormFields.shardConfigServers],
            });
          }
        }
      }
    }
  );
};

export const CUSTOM_NR_UNITS_INPUT_VALUE = 'custom-units-nr';
