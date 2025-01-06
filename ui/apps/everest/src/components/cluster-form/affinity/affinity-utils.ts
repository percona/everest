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
