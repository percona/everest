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
  OperatorUpgradePreflightPayload,
} from 'shared-types/dbEngines.types';
import {
  getDbEnginesFn,
  getOperatorUpgradePreflight,
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

export const useDbEngineUpgradePreflight = (
  namespace: string,
  dbEngineName: string,
  targetVersion: string,
  options?: PerconaQueryOptions<OperatorUpgradePreflightPayload>
) =>
  useQuery<OperatorUpgradePreflightPayload>({
    queryKey: [
      'dbEngineUpgradePreflight',
      namespace,
      dbEngineName,
      targetVersion,
    ],
    queryFn: () =>
      getOperatorUpgradePreflight(namespace, dbEngineName, targetVersion),
    ...options,
  });

export const useOperatorUpgrade = (
  namespace: string,
  dbEngineName: string,
  targetVersion: string,
  options?: UseMutationOptions<unknown, unknown, null, unknown>
) =>
  useMutation({
    mutationKey: ['operatorUpgrade', namespace, dbEngineName, targetVersion],
    mutationFn: () => upgradeOperator(namespace, dbEngineName, targetVersion),
    ...options,
  });
