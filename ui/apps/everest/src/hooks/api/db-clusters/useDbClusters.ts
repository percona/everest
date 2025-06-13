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
  useQueries,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { getDbClustersFn } from 'api/dbClusterApi';
import { DbCluster, GetDbClusterPayload } from 'shared-types/dbCluster.types';
import { PerconaQueryOptions } from 'shared-types/query.types';
import cronConverter from 'utils/cron-converter';
import { useClusters } from '../clusters/useClusters';
import { getNamespacesForCluster } from 'api/namespaces';
import { Cluster } from 'api/clusters';

export interface DbClusterForNamespaceResult {
  cluster: string;
  namespace: string;
  queryResult: UseQueryResult<DbCluster[], unknown>;
}

export const DB_CLUSTERS_QUERY_KEY = 'dbClusters';

export const dbClustersQuerySelect = ({
  items,
}: Pick<GetDbClusterPayload, 'items'>): DbCluster[] =>
  items
    .map(({ ...props }) => ({
      ...props,
      spec: {
        ...props.spec,
        ...(props.spec?.backup?.schedules && {
          backup: {
            ...props.spec.backup,
            schedules: props.spec.backup.schedules.map((schedule) => ({
              ...schedule,
              schedule: cronConverter(
                schedule.schedule,
                'UTC',
                Intl.DateTimeFormat().resolvedOptions().timeZone
              ),
            })),
          },
        }),
      },
    }))
    .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

export const useDbClusters = (
  options?: PerconaQueryOptions<GetDbClusterPayload, unknown, DbCluster[]>
) => {
  // First, get all clusters
  const { data: clusters = [], isLoading: clustersLoading } = useClusters();

  // For each cluster, get its namespaces
  const namespacesQueries = clusters.map((cluster: Cluster) => ({
    queryKey: ['namespaces', cluster.name],
    queryFn: () => getNamespacesForCluster(cluster.name),
  }));

  const namespacesResults = useQueries({ queries: namespacesQueries });
  const namespacesLoading = namespacesResults.some((result) => result.isLoading);

  // For each cluster and its namespaces, get the DB clusters
  const dbClusterQueries: UseQueryOptions<GetDbClusterPayload, unknown, DbCluster[]>[] = [];
  clusters.forEach((cluster: Cluster, clusterIndex: number) => {
    const namespaceResult = namespacesResults[clusterIndex];
    const namespaces = namespaceResult.data || [];
    namespaces.forEach((namespace: string) => {
      dbClusterQueries.push({
        queryKey: [DB_CLUSTERS_QUERY_KEY, cluster.name, namespace],
        queryFn: () => getDbClustersFn(cluster.name, namespace),
        refetchInterval: 5 * 1000,
        ...options,
        select: (clusters) => {
          const transformedClusters: DbCluster[] = options?.select
            ? options.select(clusters)
            : clusters.items;

          return dbClustersQuerySelect({
            items: transformedClusters,
          });
        },
      });
    });
  });

  const dbClusterResults = useQueries({ queries: dbClusterQueries });
  const dbClustersLoading = dbClusterResults.some((result) => result.isLoading);

  // Combine all results
  const results: DbClusterForNamespaceResult[] = [];
  let queryIndex = 0;
  clusters.forEach((cluster: Cluster, clusterIndex: number) => {
    const namespaceResult = namespacesResults[clusterIndex];
    const namespaces = namespaceResult.data || [];
    namespaces.forEach((namespace: string) => {
      if (queryIndex < dbClusterResults.length) {
        results.push({
          cluster: cluster.name,
          namespace,
          queryResult: dbClusterResults[queryIndex],
        });
        queryIndex++;
      }
    });
  });

  return {
    results,
    isLoading: clustersLoading || namespacesLoading || dbClustersLoading,
  };
};
