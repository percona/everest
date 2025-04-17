import {
  AffinityRule,
  Affinity,
  AffinityComponent,
  AffinityType,
  AffinityPriority,
  AffinityOperator,
} from 'shared-types/affinity.types';
import {
  affinityRulesToDbPayload,
  areAffinityRulesDefault,
  getDefaultAffinityRules,
} from './db';
import { DbType } from '@percona/types';
import { DEFAULT_TOPOLOGY_KEY } from 'consts';

describe('affinityRulesToDbPayload', () => {
  const tests: [string, AffinityRule[], Affinity][] = [
    ['empty', [], {}],
    [
      'single required node affinity',
      [
        {
          component: AffinityComponent.DbNode,
          type: AffinityType.NodeAffinity,
          priority: AffinityPriority.Required,
          uid: '',
          key: 'my-key',
          operator: AffinityOperator.Exists,
        },
      ],
      {
        nodeAffinity: {
          requiredDuringSchedulingIgnoredDuringExecution: {
            nodeSelectorTerms: [
              {
                matchExpressions: [
                  {
                    key: 'my-key',
                    operator: AffinityOperator.Exists,
                  },
                ],
              },
            ],
          },
        },
      },
    ],
    [
      'multiple required node affinity',
      [
        {
          component: AffinityComponent.DbNode,
          type: AffinityType.NodeAffinity,
          priority: AffinityPriority.Required,
          uid: '',
          key: 'my-key',
          operator: AffinityOperator.Exists,
        },
        {
          component: AffinityComponent.DbNode,
          type: AffinityType.NodeAffinity,
          priority: AffinityPriority.Required,
          uid: '',
          key: 'my-other-key',
          operator: AffinityOperator.In,
          values: 'value1,value2',
        },
      ],
      {
        nodeAffinity: {
          requiredDuringSchedulingIgnoredDuringExecution: {
            nodeSelectorTerms: [
              {
                matchExpressions: [
                  {
                    key: 'my-key',
                    operator: AffinityOperator.Exists,
                  },
                ],
              },
              {
                matchExpressions: [
                  {
                    key: 'my-other-key',
                    operator: AffinityOperator.In,
                    values: ['value1', 'value2'],
                  },
                ],
              },
            ],
          },
        },
      },
    ],
    [
      'mixed affinities',
      [
        {
          component: AffinityComponent.DbNode,
          type: AffinityType.NodeAffinity,
          priority: AffinityPriority.Preferred,
          weight: 10,
          uid: '',
          key: 'my-key',
          operator: AffinityOperator.Exists,
        },
        {
          component: AffinityComponent.DbNode,
          type: AffinityType.PodAffinity,
          priority: AffinityPriority.Required,
          topologyKey: 'my-topology-key',
          uid: '',
        },
        {
          component: AffinityComponent.DbNode,
          type: AffinityType.PodAntiAffinity,
          priority: AffinityPriority.Preferred,
          weight: 20,
          topologyKey: 'my-topology-key',
          operator: AffinityOperator.NotIn,
          key: 'my-key',
          values: 'value1',
          uid: '',
        },
      ],
      {
        nodeAffinity: {
          preferredDuringSchedulingIgnoredDuringExecution: [
            {
              weight: 10,
              preference: {
                matchExpressions: [
                  {
                    key: 'my-key',
                    operator: AffinityOperator.Exists,
                  },
                ],
              },
            },
          ],
        },
        podAffinity: {
          requiredDuringSchedulingIgnoredDuringExecution: [
            {
              topologyKey: 'my-topology-key',
            },
          ],
        },
        podAntiAffinity: {
          preferredDuringSchedulingIgnoredDuringExecution: [
            {
              weight: 20,
              podAffinityTerm: {
                topologyKey: 'my-topology-key',
                labelSelector: {
                  matchExpressions: [
                    {
                      key: 'my-key',
                      operator: AffinityOperator.NotIn,
                      values: ['value1'],
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    ],
  ];

  tests.map(([name, input, expected]) => {
    it(name, () => {
      expect(affinityRulesToDbPayload(input)).toEqual(expected);
    });
  });
});

describe('areAffinityRulesDefault', () => {
  describe('MongoDB', () => {
    test('Empty affinity rules for MongoDB', () => {
      expect(areAffinityRulesDefault([], DbType.Mongo, false)).toBe(false);
    });
    test('Default affinity rules for MongoDB, no sharding', () => {
      expect(
        areAffinityRulesDefault(
          getDefaultAffinityRules(DbType.Mongo, false),
          DbType.Mongo,
          false
        )
      ).toBe(true);
    });
    test('Default affinity rules for MongoDB, with sharding', () => {
      expect(
        areAffinityRulesDefault(
          getDefaultAffinityRules(DbType.Mongo, true),
          DbType.Mongo,
          true
        )
      ).toBe(true);
    });
    test('Custom affinity rules for MongoDB', () => {
      expect(
        areAffinityRulesDefault(
          [
            ...getDefaultAffinityRules(DbType.Mongo, true),
            {
              component: AffinityComponent.ConfigServer,
              type: AffinityType.PodAntiAffinity,
              priority: AffinityPriority.Preferred,
              topologyKey: DEFAULT_TOPOLOGY_KEY,
              operator: AffinityOperator.NotIn,
              key: 'my-key',
              values: 'value1',
              uid: '',
            },
          ],
          DbType.Mongo,
          false
        )
      ).toBe(false);
    });
  });
  describe('MySQL', () => {
    test('Empty affinity rules for MySQL', () => {
      expect(areAffinityRulesDefault([], DbType.Mysql, false)).toBe(false);
    });
    test('Default affinity rules for Mysql, no sharding', () => {
      expect(
        areAffinityRulesDefault(
          getDefaultAffinityRules(DbType.Mysql),
          DbType.Mysql,
          false
        )
      ).toBe(true);
    });
    test('Custom affinity rules for Mysql', () => {
      const defaultRules = getDefaultAffinityRules(DbType.Mysql);
      defaultRules[0].key = 'my-key';
      expect(
        areAffinityRulesDefault([...defaultRules], DbType.Mysql, false)
      ).toBe(false);
    });
  });
});
