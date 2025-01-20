import { MongoIcon, MySqlIcon, PostgreSqlIcon } from '@percona/ui-lib';
import { DbType, ProxyType } from '@percona/types';
import {
  DbCluster,
  ManageableSchedules,
  Proxy,
  ProxyExposeConfig,
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
  PreferredNodeSchedulingTerm,
  PreferredPodSchedulingTerm,
  RequiredNodeSchedulingTerm,
  RequiredPodSchedulingTerm,
} from 'shared-types/affinity.types';
import { generateShortUID } from './generateShortUID';
import { DEFAULT_TOPOLOGY_KEY } from 'consts';

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

export const dbPayloadToAffinityRules = (
  dbCluster: DbCluster
): AffinityRule[] => {
  const rules: AffinityRule[] = [];
  const {
    spec: {
      engine = { affinity: {} as Affinity },
      proxy = { affinity: {} as Affinity },
      sharding = { configServer: { affinity: {} as Affinity } },
    },
  } = dbCluster;
  const { affinity: engineAffinity } = engine;
  const { affinity: proxyAffinity } = proxy as Proxy;
  const { affinity: configServerAffinity } = sharding.configServer;
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

export const changeDbClusterAffinityRules = (
  dbCluster: DbCluster,
  newRules: AffinityRule[]
): DbCluster => {
  const filteredRules: Record<AffinityComponent, AffinityRule[]> = {
    [AffinityComponent.DbNode]: [],
    [AffinityComponent.Proxy]: [],
    [AffinityComponent.ConfigServer]: [],
  };

  newRules.forEach((rule) => {
    filteredRules[rule.component].push(rule);
  });

  return {
    ...dbCluster,
    spec: {
      ...dbCluster!.spec,
      engine: {
        ...dbCluster!.spec.engine,
        affinity: affinityRulesToDbPayload(filteredRules.dbNode),
      },
      proxy: {
        ...dbCluster!.spec.proxy,
        affinity: affinityRulesToDbPayload(filteredRules.proxy),
      },
      ...(dbCluster!.spec.sharding && {
        sharding: {
          ...dbCluster!.spec.sharding,
          configServer: {
            ...dbCluster!.spec.sharding?.configServer,
            affinity: affinityRulesToDbPayload(filteredRules.configServer),
          },
        },
      }),
    },
  } as DbCluster;
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
