// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  UseMutationOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { PerconaQueryOptions } from 'shared-types/query.types';
import {
  DbEngine,
  DbEngineStatus,
  DbEngineType,
  EngineToolPayload,
  GetDbEnginesPayload,
  OperatorsUpgradePlan,
} from 'shared-types/dbEngines.types';
import {
  getDbEnginesFn,
  getOperatorsUpgradePlan,
  upgradeOperator,
} from 'api/dbEngineApi';

const DB_TYPE_ORDER_MAP: Record<DbEngineType, number> = {
  // Lower is more important
  [DbEngineType.PXC]: 1,
  [DbEngineType.PSMDB]: 2,
  [DbEngineType.POSTGRESQL]: 3,
};

export const dbEnginesQuerySelect = (
  { items = [] }: GetDbEnginesPayload,
  retrieveUpgradingEngines = false
): DbEngine[] =>
  items
    .filter(
      (item) =>
        item.status &&
        (item.status.status === DbEngineStatus.INSTALLED ||
          (retrieveUpgradingEngines &&
            item.status.status === DbEngineStatus.UPGRADING))
    )
    .map(({ spec: { type }, status, metadata: { name } }) => {
      const {
        status: engineStatus,
        availableVersions,
        operatorVersion,
        pendingOperatorUpgrades = [],
        operatorUpgrade,
      } = status!;
      const result: DbEngine = {
        type,
        name,
        operatorVersion,
        status: engineStatus,
        availableVersions: {
          backup: [],
          engine: [],
          proxy: [],
        },
        pendingOperatorUpgrades,
        operatorUpgrade,
      };

      ['backup', 'engine', 'proxy'].forEach(
        // @ts-ignore
        (toolName: keyof typeof availableVersions) => {
          if (
            !availableVersions ||
            !Object.keys(availableVersions).length ||
            !availableVersions[toolName]
          ) {
            return;
          }

          const tool: Record<string, EngineToolPayload> =
            availableVersions[toolName];
          const versions = Object.keys(tool);

          versions.forEach((version) => {
            result.availableVersions[toolName].push({
              version,
              ...tool[version],
            });
          });
        }
      );

      return result;
    })
    .sort(
      ({ type: dbTypeA }, { type: dbTypeB }) =>
        DB_TYPE_ORDER_MAP[dbTypeA] - DB_TYPE_ORDER_MAP[dbTypeB]
    );

export const useDbEngines = (
  namespace: string,
  options?: PerconaQueryOptions<GetDbEnginesPayload, unknown, DbEngine[]>,
  retrieveUpgradingEngines = false
) =>
  useQuery<GetDbEnginesPayload, unknown, DbEngine[]>({
    queryKey: [`dbEngines_${namespace}`],
    queryFn: () => getDbEnginesFn(namespace),
    select: (data) => dbEnginesQuerySelect(data, retrieveUpgradingEngines),
    enabled: !!namespace,
    retry: 2,
    ...options,
  });

export const useOperatorUpgrade = (
  namespace: string,
  options?: UseMutationOptions<unknown, unknown, null, unknown>
) =>
  useMutation({
    mutationKey: ['operatorUpgrade', namespace],
    mutationFn: () => upgradeOperator(namespace),
    ...options,
  });

export type UseOperatorsUpgradePlanType = OperatorsUpgradePlan & {
  upToDate: Array<{
    name: string;
    currentVersion: string;
  }>;
};

export const useOperatorsUpgradePlan = (
  namespace: string,
  options?: PerconaQueryOptions<UseOperatorsUpgradePlanType>
) =>
  useQuery<UseOperatorsUpgradePlanType>({
    queryKey: ['operatorUpgradePlan', namespace],
    queryFn: async () => {
      const engines = await getDbEnginesFn(namespace);
      const operatorUpgradePlan = await getOperatorsUpgradePlan(namespace);
      const operatorsWithUpgrades = operatorUpgradePlan.upgrades.map(
        (plan) => plan.name
      );

      return {
        ...operatorUpgradePlan,
        upToDate: engines.items
          .filter(
            (engine) => !operatorsWithUpgrades.includes(engine.metadata.name)
          )
          .map((engine) => ({
            name: engine.metadata.name,
            currentVersion: engine.status?.operatorVersion || '',
          })),
      };
    },
    ...options,
  });
