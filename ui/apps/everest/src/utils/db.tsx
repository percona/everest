import { MongoIcon, MySqlIcon, PostgreSqlIcon } from '@percona/ui-lib';
import { DbEngineType, DbType, ProxyType } from '@percona/types';
import {
  DbCluster,
  DbClusterStatus,
  ManageableSchedules,
  Proxy,
  ProxyExposeConfig,
  ProxyExposeType,
  Schedule,
} from 'shared-types/dbCluster.types';
import { can } from './rbac';
import {
  Affinity,
  AffinityComponent,
  AffinityMatchExpression,
  AffinityOperator,
  AffinityPriority,
  AffinityRule,
  AffinityType,
  NodeAffinity,
  PodAffinity,
  PodAffinityTerm,
  PodAntiAffinity,
  PodSchedulingPolicy,
  PreferredNodeSchedulingTerm,
  PreferredPodSchedulingTerm,
  RequiredNodeSchedulingTerm,
  RequiredPodSchedulingTerm,
} from 'shared-types/affinity.types';
import { generateShortUID } from './generateShortUID';
import { DEFAULT_TOPOLOGY_KEY } from 'consts';
import { capitalize } from '@mui/material';
import { getProxySpec } from 'hooks/api/db-cluster/utils';
import { dbEngineToDbType } from '@percona/utils';
import { MIN_NUMBER_OF_SHARDS } from 'components/cluster-form';
import { Path, UseFormGetFieldState } from 'react-hook-form';
import cronConverter from './cron-converter';

export const dbTypeToIcon = (dbType: DbType) => {
  switch (dbType) {
    case DbType.Mongo:
      return MongoIcon;
    case DbType.Mysql:
      return MySqlIcon;
    default:
      return PostgreSqlIcon;
  }
};

export const shortenOperatorName = (name: string) => {
  if (name.includes('postgresql')) {
    return 'postgresql';
  }

  if (name.includes('xtradb')) {
    return 'pxc';
  }

  if (name.includes('mongodb')) {
    return 'psmdb';
  }

  return name;
};

export const dbTypeToProxyType = (dbType: DbType): ProxyType => {
  switch (dbType) {
    case DbType.Mongo:
      return 'mongos';
    case DbType.Mysql:
      return 'haproxy';
    default:
      return 'pgbouncer';
  }
};

export const getProxyUnitNamesFromDbType = (
  dbType: DbType
): { singular: string; plural: string } => {
  switch (dbType) {
    case DbType.Postresql:
      return { singular: 'PG Bouncer', plural: 'PG Bouncers' };
    case DbType.Mongo:
      return { singular: 'router', plural: 'routers' };
    case DbType.Mysql:
    default:
      return { singular: 'proxy', plural: 'proxies' };
  }
};

export const getPreviewResourcesText = (
  type: 'CPU' | 'Memory' | 'Disk',
  parsedResource: number,
  sharding: boolean,
  measurementUnit: string,
  parsedShardNr?: number
) => {
  return Number.isNaN(parsedResource)
    ? ''
    : `${type} - ${sharding && parsedShardNr ? (parsedShardNr * parsedResource).toFixed(2) : parsedResource.toFixed(2)} ${measurementUnit}`;
};

export const someErrorInStateFields = <T extends Record<string, unknown>>(
  fieldStateGetter: UseFormGetFieldState<T>,
  fields: Path<T>[]
) => {
  return fields.some((field) => fieldStateGetter(field)?.error);
};

export const isProxy = (proxy: Proxy | ProxyExposeConfig): proxy is Proxy => {
  return proxy && typeof (proxy as Proxy).expose === 'object';
};

export const transformSchedulesIntoManageableSchedules = async (
  schedules: Schedule[],
  namespace: string,
  canCreateBackups: boolean,
  canUpdateDb: boolean
) => {
  const transformedSchedules: ManageableSchedules[] = await Promise.all(
    schedules.map(async (schedule) => ({
      ...schedule,
      canBeManaged:
        (await can(
          'read',
          'backup-storages',
          `${namespace}/${schedule.backupStorageName}`
        )) &&
        canCreateBackups &&
        canUpdateDb,
    }))
  );

  return transformedSchedules;
};

export const dbPayloadToAffinityRules = (
  payload: PodSchedulingPolicy
): AffinityRule[] => {
  const rules: AffinityRule[] = [];
  const {
    spec: { engineType, affinityConfig = {} },
  } = payload;
  const engineAffinity = affinityConfig[engineType]?.engine || {};
  const proxyAffinity = affinityConfig[engineType]?.proxy || {};
  const configServerAffinity = affinityConfig[engineType]?.configServer || {};
  const allAffinities = [
    {
      affinityObject: engineAffinity,
      component: AffinityComponent.DbNode,
    },
    {
      affinityObject: proxyAffinity,
      component: AffinityComponent.Proxy,
    },
    {
      affinityObject: configServerAffinity,
      component: AffinityComponent.ConfigServer,
    },
  ];

  allAffinities.forEach(({ affinityObject, component }) => {
    if (affinityObject && Object.keys(affinityObject).length) {
      const { nodeAffinity, podAffinity, podAntiAffinity } = affinityObject;

      if (nodeAffinity) {
        const {
          preferredDuringSchedulingIgnoredDuringExecution = [],
          requiredDuringSchedulingIgnoredDuringExecution = {
            nodeSelectorTerms: [],
          },
        } = nodeAffinity;

        preferredDuringSchedulingIgnoredDuringExecution.forEach(
          ({ preference = { matchExpressions: [] }, weight }) => {
            rules.push({
              component,
              type: AffinityType.NodeAffinity,
              priority: AffinityPriority.Preferred,
              uid: generateShortUID(),
              weight,
              ...(preference.matchExpressions.length > 0 && {
                key: preference.matchExpressions[0].key,
                operator: preference.matchExpressions[0].operator,
                values: preference.matchExpressions[0].values?.join(','),
              }),
            });
          }
        );

        requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms.forEach(
          ({ matchExpressions = [] }) => {
            rules.push({
              component,
              type: AffinityType.NodeAffinity,
              priority: AffinityPriority.Required,
              uid: generateShortUID(),
              ...(matchExpressions.length > 0 && {
                key: matchExpressions[0].key,
                operator: matchExpressions[0].operator,
                values: matchExpressions[0].values?.join(','),
              }),
            });
          }
        );
      }

      [podAffinity, podAntiAffinity].forEach((affinity) => {
        if (affinity) {
          const affinityType =
            affinity === podAffinity
              ? AffinityType.PodAffinity
              : AffinityType.PodAntiAffinity;
          const {
            preferredDuringSchedulingIgnoredDuringExecution = [],
            requiredDuringSchedulingIgnoredDuringExecution = [],
          } = affinity;
          preferredDuringSchedulingIgnoredDuringExecution.forEach(
            ({ weight, podAffinityTerm }) => {
              const { topologyKey, labelSelector = { matchExpressions: [] } } =
                podAffinityTerm;

              rules.push({
                component,
                type: affinityType,
                priority: AffinityPriority.Preferred,
                uid: generateShortUID(),
                weight,
                topologyKey,
                ...(labelSelector.matchExpressions.length > 0 && {
                  key: labelSelector.matchExpressions[0].key,
                  operator: labelSelector.matchExpressions[0].operator,
                  values: labelSelector.matchExpressions[0].values?.join(','),
                }),
              });
            }
          );

          requiredDuringSchedulingIgnoredDuringExecution.forEach(
            ({ topologyKey, labelSelector = { matchExpressions: [] } }) => {
              rules.push({
                component,
                type: affinityType,
                priority: AffinityPriority.Required,
                uid: generateShortUID(),
                topologyKey,
                ...(labelSelector.matchExpressions.length > 0 && {
                  key: labelSelector.matchExpressions[0].key,
                  operator: labelSelector.matchExpressions[0].operator,
                  values: labelSelector.matchExpressions[0].values?.join(','),
                }),
              });
            }
          );
        }
      });
    }
  });

  return rules;
};

export const affinityRulesToDbPayload = (
  affinityRules: AffinityRule[]
): Affinity => {
  const generatePodAffinityTerm = (
    topologyKey: string,
    operator: AffinityOperator,
    values: string[],
    key?: string
  ): PodAffinityTerm => ({
    topologyKey: topologyKey!,
    ...(key && {
      labelSelector: {
        matchExpressions: [
          {
            key,
            operator: operator!,
            ...(values.length > 0 && {
              values,
            }),
          },
        ],
      },
    }),
  });

  type AffinityRulesPayloadMap = {
    [AffinityType.NodeAffinity]: {
      preferred: PreferredNodeSchedulingTerm[];
      required: RequiredNodeSchedulingTerm;
    };
  } & {
    [key in AffinityType.PodAffinity | AffinityType.PodAntiAffinity]: {
      preferred: PreferredPodSchedulingTerm[];
      required: RequiredPodSchedulingTerm;
    };
  };

  const map: AffinityRulesPayloadMap = {
    [AffinityType.NodeAffinity]: {
      preferred: [],
      required: { nodeSelectorTerms: [] },
    },
    [AffinityType.PodAffinity]: {
      preferred: [],
      required: [],
    },
    [AffinityType.PodAntiAffinity]: {
      preferred: [],
      required: [],
    },
  };

  affinityRules.forEach((rule) => {
    const { values = '', type, weight, key, operator, topologyKey } = rule;
    const valuesList = values.split(',');

    const required = rule.priority === AffinityPriority.Required;

    switch (type) {
      case AffinityType.NodeAffinity: {
        const matchExpressions: AffinityMatchExpression[] = [
          {
            key: key!,
            operator: operator!,
            ...([AffinityOperator.In, AffinityOperator.NotIn].includes(
              operator!
            ) && {
              values: valuesList,
            }),
          },
        ];

        if (required) {
          map[AffinityType.NodeAffinity].required.nodeSelectorTerms.push({
            matchExpressions,
          });
        } else {
          map[AffinityType.NodeAffinity].preferred.push({
            weight: weight!,
            preference: {
              matchExpressions,
            },
          });
        }
        break;
      }

      case AffinityType.PodAntiAffinity:
      case AffinityType.PodAffinity: {
        const podAffinityTerm = generatePodAffinityTerm(
          topologyKey!,
          operator!,
          valuesList,
          key
        );
        if (required) {
          map[type].required.push(podAffinityTerm);
        } else {
          map[type].preferred.push({
            weight: weight!,
            podAffinityTerm,
          });
        }
        break;
      }
    }
  });
  const nodeAffinity: NodeAffinity = {
    ...(map[AffinityType.NodeAffinity].preferred.length > 0 && {
      preferredDuringSchedulingIgnoredDuringExecution:
        map[AffinityType.NodeAffinity].preferred,
    }),
    ...(map[AffinityType.NodeAffinity].required.nodeSelectorTerms.length >
      0 && {
      requiredDuringSchedulingIgnoredDuringExecution:
        map[AffinityType.NodeAffinity].required,
    }),
  };
  const podAffinity: PodAffinity = {
    ...(map[AffinityType.PodAffinity].preferred.length > 0 && {
      preferredDuringSchedulingIgnoredDuringExecution:
        map[AffinityType.PodAffinity].preferred,
    }),
    ...(map[AffinityType.PodAffinity].required.length > 0 && {
      requiredDuringSchedulingIgnoredDuringExecution:
        map[AffinityType.PodAffinity].required,
    }),
  };
  const podAntiAffinity: PodAntiAffinity = {
    ...(map[AffinityType.PodAntiAffinity].preferred.length > 0 && {
      preferredDuringSchedulingIgnoredDuringExecution:
        map[AffinityType.PodAntiAffinity].preferred,
    }),
    ...(map[AffinityType.PodAntiAffinity].required.length > 0 && {
      requiredDuringSchedulingIgnoredDuringExecution:
        map[AffinityType.PodAntiAffinity].required,
    }),
  };

  const finalObject: Affinity = {
    ...(Object.keys(nodeAffinity).length > 0 && {
      nodeAffinity,
    }),
    ...(Object.keys(podAffinity).length > 0 && {
      podAffinity,
    }),
    ...(Object.keys(podAntiAffinity).length > 0 && {
      podAntiAffinity,
    }),
  };

  return finalObject;
};

export const insertAffinityRuleToExistingPolicy = (
  policy: PodSchedulingPolicy,
  rule: AffinityRule
): PodSchedulingPolicy => {
  const dbType = policy.spec.engineType;
  const formattedRule = affinityRulesToDbPayload([rule]);

  if (!policy.spec.affinityConfig) {
    policy.spec.affinityConfig = {};
  }

  if (!policy.spec.affinityConfig[dbType]) {
    policy.spec.affinityConfig[dbType] = {};
  }

  if (!policy.spec.affinityConfig[dbType][rule.component]) {
    policy.spec.affinityConfig[dbType][rule.component] = {};
  }

  if (rule.type === AffinityType.NodeAffinity) {
    if (!policy.spec.affinityConfig[dbType][rule.component]?.nodeAffinity) {
      policy.spec.affinityConfig[dbType][rule.component]!.nodeAffinity = {
        requiredDuringSchedulingIgnoredDuringExecution: {
          nodeSelectorTerms: [],
        },
        preferredDuringSchedulingIgnoredDuringExecution: [],
      };
    }

    if (rule.priority === AffinityPriority.Required) {
      policy.spec.affinityConfig[dbType][
        rule.component
      ]!.nodeAffinity!.requiredDuringSchedulingIgnoredDuringExecution!.nodeSelectorTerms =
        [
          ...policy.spec.affinityConfig[dbType][rule.component]!.nodeAffinity!
            .requiredDuringSchedulingIgnoredDuringExecution!.nodeSelectorTerms,
          ...(formattedRule.nodeAffinity
            ?.requiredDuringSchedulingIgnoredDuringExecution
            ?.nodeSelectorTerms || []),
        ];
    } else {
      policy.spec.affinityConfig[dbType][
        rule.component
      ]!.nodeAffinity!.preferredDuringSchedulingIgnoredDuringExecution = [
        ...(policy.spec.affinityConfig[dbType][rule.component]!.nodeAffinity!
          .preferredDuringSchedulingIgnoredDuringExecution || []),
        ...(formattedRule.nodeAffinity
          ?.preferredDuringSchedulingIgnoredDuringExecution || []),
      ];
    }
  } else {
    const affinityType = rule.type;

    if (!policy.spec.affinityConfig[dbType][rule.component]![affinityType]) {
      policy.spec.affinityConfig[dbType][rule.component]![affinityType] = {
        preferredDuringSchedulingIgnoredDuringExecution: [],
        requiredDuringSchedulingIgnoredDuringExecution: [],
      };
    }

    if (rule.priority === AffinityPriority.Required) {
      policy.spec.affinityConfig[dbType][rule.component]![
        affinityType
      ]!.requiredDuringSchedulingIgnoredDuringExecution = [
        ...(policy.spec.affinityConfig[dbType][rule.component]![affinityType]!
          .requiredDuringSchedulingIgnoredDuringExecution || []),
        ...(formattedRule[affinityType]
          ?.requiredDuringSchedulingIgnoredDuringExecution || []),
      ];
    } else {
      policy.spec.affinityConfig[dbType][rule.component]![
        affinityType
      ]!.preferredDuringSchedulingIgnoredDuringExecution = [
        ...(policy.spec.affinityConfig[dbType][rule.component]![affinityType]!
          .preferredDuringSchedulingIgnoredDuringExecution || []),
        ...(formattedRule[affinityType]
          ?.preferredDuringSchedulingIgnoredDuringExecution || []),
      ];
    }
  }

  return policy;
};

export const getAffinityRuleTypeLabel = (type: AffinityType): string => {
  switch (type) {
    case AffinityType.NodeAffinity:
      return 'Node Affinity';
    case AffinityType.PodAffinity:
      return 'Pod Affinity';
    case AffinityType.PodAntiAffinity:
      return 'Pod Anti-Affinity';
    default:
      return '';
  }
};

export const generateDefaultAffinityRule = (
  component: AffinityComponent
): AffinityRule => ({
  component,
  type: AffinityType.PodAntiAffinity,
  priority: AffinityPriority.Preferred,
  weight: 1,
  topologyKey: DEFAULT_TOPOLOGY_KEY,
  uid: generateShortUID(),
});

export const areAffinityRulesEqual = (
  rule1: AffinityRule,
  rule2: AffinityRule
) => {
  return (
    rule1.component === rule2.component &&
    rule1.type === rule2.type &&
    rule1.priority === rule2.priority &&
    rule1.weight === rule2.weight &&
    rule1.topologyKey === rule2.topologyKey &&
    rule1.key === rule2.key &&
    rule1.operator === rule2.operator &&
    rule1.values === rule2.values
  );
};

export const getDefaultAffinityRules = (
  dbType: DbType,
  sharding: boolean = false
) => {
  const rules: AffinityRule[] = [
    generateDefaultAffinityRule(AffinityComponent.DbNode),
  ];

  if (dbType === DbType.Mongo) {
    if (sharding) {
      rules.push(generateDefaultAffinityRule(AffinityComponent.Proxy));
      rules.push(generateDefaultAffinityRule(AffinityComponent.ConfigServer));
    }
  } else {
    rules.push(generateDefaultAffinityRule(AffinityComponent.Proxy));
  }
  return rules;
};

export const areAffinityRulesDefault = (
  rules: AffinityRule[],
  dbType: DbType,
  sharding = false
) => {
  const defaultRules = getDefaultAffinityRules(dbType, sharding);

  // This also covers the case when there are no rules. Unless the default rules were empty, which would be correct.
  if (rules.length !== defaultRules.length) {
    return false;
  }

  return rules.every((rule) =>
    defaultRules.find((defaultRule) => areAffinityRulesEqual(rule, defaultRule))
  );
};
export const getAffinityComponentLabel = (
  dbType: DbType,
  component: AffinityComponent
): string => {
  switch (component) {
    case AffinityComponent.Proxy:
      return capitalize(getProxyUnitNamesFromDbType(dbType).singular);
    case AffinityComponent.ConfigServer:
      return 'Config Server';
    case AffinityComponent.DbNode:
      return 'DB Node';
    default:
      return '';
  }
};
export const changeDbClusterCrd = (
  dbCluster: DbCluster,
  newCrdVersion: string
): DbCluster => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      crVersion: newCrdVersion,
    },
  },
});

export const changeDbClusterAdvancedConfig = (
  dbCluster: DbCluster,
  engineParametersEnabled = false,
  externalAccess = false,
  engineParameters = '',
  sourceRanges?: Array<{ sourceRange?: string }>
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      config: engineParametersEnabled ? engineParameters : '',
    },
    proxy: {
      ...dbCluster.spec.proxy,
      expose: {
        type: externalAccess
          ? ProxyExposeType.external
          : ProxyExposeType.internal,
        ...(!!externalAccess &&
          sourceRanges && {
            ipSourceRanges: sourceRanges.flatMap((source) =>
              source.sourceRange ? [source.sourceRange] : []
            ),
          }),
      },
    } as Proxy,
  },
});

export const changeDbClusterVersion = (
  dbCluster: DbCluster,
  dbVersion: string
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      version: dbVersion,
    },
  },
});

export const changeDbClusterMonitoring = (
  dbCluster: DbCluster,
  monitoringName?: string
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    monitoring: monitoringName
      ? {
          monitoringConfigName: monitoringName,
        }
      : {},
  },
});

export const changeDbClusterResources = (
  dbCluster: DbCluster,
  newResources: {
    cpu: number;
    memory: number;
    disk: number;
    diskUnit: string;
    numberOfNodes: number;
    proxyCpu: number;
    proxyMemory: number;
    numberOfProxies: number;
  },
  sharding = false,
  shardNr = '',
  shardConfigServers?: number
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      replicas: newResources.numberOfNodes,
      resources: {
        cpu: `${newResources.cpu}`,
        memory: `${newResources.memory}G`,
      },
      storage: {
        ...dbCluster.spec.engine.storage,
        size: `${newResources.disk}${newResources.diskUnit}`,
      },
    },
    proxy: getProxySpec(
      dbEngineToDbType(dbCluster.spec.engine.type),
      newResources.numberOfProxies.toString(),
      '',
      (dbCluster.spec.proxy as Proxy).expose.type === 'external',
      newResources.proxyCpu,
      newResources.proxyMemory,
      !!sharding,
      ((dbCluster.spec.proxy as Proxy).expose.ipSourceRanges || []).map(
        (sourceRange) => ({ sourceRange })
      )
    ),
    ...(dbCluster.spec.engine.type === DbEngineType.PSMDB &&
      sharding && {
        sharding: {
          enabled: sharding,
          shards: +(shardNr ?? MIN_NUMBER_OF_SHARDS),
          configServer: {
            replicas: shardConfigServers ?? 3,
          },
        },
      }),
  },
});

export const changeDbClusterEngine = (
  dbCluster: DbCluster,
  newEngineVersion: string
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    engine: {
      ...dbCluster.spec.engine,
      version: newEngineVersion,
    },
  },
});

export const changeDbClusterPITR = (
  dbCluster: DbCluster,
  enabled: boolean,
  backupStorageName: string | { name: string }
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    backup: {
      ...dbCluster.spec.backup!,
      pitr: enabled
        ? {
            backupStorageName:
              typeof backupStorageName === 'string'
                ? backupStorageName
                : backupStorageName!.name,
            enabled: true,
          }
        : { enabled: false, backupStorageName: '' },
    },
  },
});

export const deleteScheduleFromDbCluster = (
  scheduleName: string,
  dbCluster: DbCluster
): DbCluster => {
  const schedules = dbCluster?.spec?.backup?.schedules || [];
  const filteredSchedulesWithCronCorrection = schedules.reduce(
    (result: Schedule[], schedule) => {
      if (schedule?.name !== scheduleName) {
        result.push(schedule);
      }
      return result;
    },
    []
  );

  return {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: dbCluster.metadata,
    spec: {
      ...dbCluster?.spec,
      backup: {
        ...dbCluster.spec.backup,
        schedules:
          filteredSchedulesWithCronCorrection.length > 0
            ? filteredSchedulesWithCronCorrection
            : undefined,
      },
    },
  };
};

export const setDbClusterPausedStatus = (
  dbCluster: DbCluster,
  paused: boolean
) => ({
  ...dbCluster,
  spec: {
    ...dbCluster.spec,
    paused,
  },
});

export const setDbClusterRestart = (dbCluster: DbCluster) => ({
  ...dbCluster,
  metadata: {
    ...dbCluster.metadata,
    annotations: {
      'everest.percona.com/restart': 'true',
    },
  },
});

const humanizedDbMap: Record<DbType, string> = {
  [DbType.Postresql]: 'PostgreSQL',
  [DbType.Mongo]: 'MongoDB',
  [DbType.Mysql]: 'MySQL',
};

export const humanizeDbType = (type: DbType): string => humanizedDbMap[type];

// This does not apply to the delete action, which is only blocked when the db is being deleted itself
export const shouldDbActionsBeBlocked = (status?: DbClusterStatus) => {
  return [
    DbClusterStatus.restoring,
    DbClusterStatus.deleting,
    DbClusterStatus.resizingVolumes,
    DbClusterStatus.upgrading,
  ].includes(status || ('' as DbClusterStatus));
};

export const mergeNewDbClusterData = (
  oldDbClusterData: DbCluster = {} as DbCluster,
  newDbClusterData: DbCluster,
  // When using setQueryData, the data is already in UTC and will be used by queryClient BEFORE `select`, so it has to be in UTC, as if coming from the API
  // In those cases, we don't want to convert the schedule to local timezone
  convertToLocalTimezone: boolean
): DbCluster => {
  const newCluster = {
    ...oldDbClusterData,
    ...newDbClusterData,
    spec: {
      ...newDbClusterData.spec,
      ...(newDbClusterData.spec?.backup?.schedules && {
        backup: {
          ...newDbClusterData.spec.backup,
          schedules: newDbClusterData.spec.backup.schedules.map((schedule) => ({
            ...schedule,
            schedule: convertToLocalTimezone
              ? cronConverter(
                  schedule.schedule,
                  'UTC',
                  Intl.DateTimeFormat().resolvedOptions().timeZone
                )
              : schedule.schedule,
          })),
        },
      }),
    },
  };

  return newCluster;
};
