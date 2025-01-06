import { DbType } from '@percona/types';
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
import { DbCluster, Proxy } from 'shared-types/dbCluster.types';
import { generateShortUID } from 'utils/generateShortUID';

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

export const availableComponentsType = (
  dbType: DbType,
  isShardingEnabled: boolean
): AffinityComponent[] => {
  return dbType === DbType.Mongo
    ? isShardingEnabled
      ? [
          AffinityComponent.ConfigServer,
          AffinityComponent.DbNode,
          AffinityComponent.Proxy,
        ]
      : [AffinityComponent.DbNode]
    : [AffinityComponent.DbNode, AffinityComponent.Proxy];
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

  return {
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
