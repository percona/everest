import { DbType } from '@percona/types';
import {
  AffinityComponent,
  AffinityPriority,
  AffinityRule,
  AffinityType,
} from 'shared-types/affinity.types';

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

export const affinityRulesToDbPayload = (affinityRules: AffinityRule[]) => {
  let nodeRequired: {
      key: string;
      operator: string;
      values?: string[];
    }[] = [],
    nodePreferred: {
      preference: {
        matchExpressions: {
          key: string;
          operator: string;
          values?: string[];
        }[];
      };
      weight?: number;
    }[] = [],
    podRequired: {
      labelSelector: {
        matchExpressions: {
          key: string;
          operator: string;
          values?: string[];
        }[];
      };
      topologyKey: string;
    }[] = [],
    podPreferred: {
      podAffinityTerm: {
        labelSelector: {
          matchExpressions: {
            key: string;
            operator: string;
            values?: string[];
          }[];
        };
        topologyKey: string;
      };
      weight: number;
    }[] = [],
    podAntiRequired: {
      labelSelector: {
        matchExpressions: {
          key: string;
          operator: string;
          values?: string[];
        }[];
      };
      topologyKey: string;
    }[] = [],
    podAntiPreferred: {
      podAffinityTerm: {
        labelSelector: {
          matchExpressions: {
            key: string;
            operator: string;
            values?: string[];
          }[];
        };
        topologyKey: string;
      };
      weight: number;
    }[] = [];

  affinityRules.forEach((rule) => {
    const { values } = rule;
    const valuesList = values ? values.split(',') : [];

    const required = rule.priority === AffinityPriority.Required;

    switch (rule.type) {
      case AffinityType.NodeAffinity: {
        const { key, operator, values } = rule;

        if (required) {
          nodeRequired = [
            ...nodeRequired!,
            {
              key: key!,
              operator: operator!,
              values: values?.split(',') || [],
            },
          ];
        } else {
          const weight = rule.weight;
          nodePreferred = [
            ...nodePreferred!,
            {
              weight: weight!,
              preference: {
                matchExpressions: [
                  {
                    key: key!,
                    operator: operator!,
                    values: values?.split(',') || [],
                  },
                ],
              },
            },
          ];
        }
        break;
      }

      case AffinityType.PodAffinity: {
        const { key, operator, topologyKey } = rule;

        if (required) {
          podRequired = [
            ...podRequired!,
            {
              labelSelector: {
                matchExpressions: [
                  {
                    key: key!,
                    operator: operator!,
                    values: valuesList,
                  },
                ],
              },
              topologyKey: topologyKey!,
            },
          ];
        } else {
          const weight = rule.weight;
          podPreferred = [
            ...podPreferred!,
            {
              podAffinityTerm: {
                labelSelector: {
                  matchExpressions: [
                    {
                      key: key!,
                      operator: operator!,
                      values: valuesList,
                    },
                  ],
                },
                topologyKey: topologyKey!,
              },
              weight: weight!,
            },
          ];
        }
        break;
      }

      case AffinityType.PodAntiAffinity: {
        const { key, operator, topologyKey } = rule;

        if (required) {
          podAntiRequired = [
            ...podAntiRequired!,
            {
              labelSelector: {
                matchExpressions: [
                  {
                    key: key!,
                    operator: operator!,
                    values: valuesList,
                  },
                ],
              },
              topologyKey: topologyKey!,
            },
          ];
        } else {
          const weight = rule.weight;
          podAntiPreferred = [
            ...podAntiPreferred!,
            {
              podAffinityTerm: {
                labelSelector: {
                  matchExpressions: [
                    {
                      key: key!,
                      operator: operator!,
                      values: valuesList,
                    },
                  ],
                },
                topologyKey: topologyKey!,
              },
              weight: weight!,
            },
          ];
        }
      }
    }
  });

  return {
    nodeAffinity: {
      requiredDuringSchedulingIgnoredDuringExecution: {
        nodeSelectorTerms: [
          {
            matchExpressions: [...nodeRequired],
          },
        ],
      },
      preferredDuringSchedulingIgnoredDuringExecution: [...nodePreferred],
    },
    podAffinity: {
      preferredDuringSchedulingIgnoredDuringExecution: [...podPreferred],
      requiredDuringSchedulingIgnoredDuringExecution: [...podRequired],
    },
    podAntiAffinity: {
      preferredDuringSchedulingIgnoredDuringExecution: [...podAntiPreferred],
      requiredDuringSchedulingIgnoredDuringExecution: [...podAntiRequired],
    },
  };
};
