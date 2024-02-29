// percona-everest-frontend
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
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { getDbClustersFn } from 'api/dbClusterApi';
import { DbCluster, GetDbClusterPayload } from 'shared-types/dbCluster.types';
import { useNamespaces } from '../namespaces/useNamespaces';

export interface DbClusterForNamespaceResult {
  namespace: string;
  queryResult: UseQueryResult<DbCluster[], unknown>;
}

export const DB_CLUSTERS_QUERY_KEY = 'dbClusters';

export const dbClustersQuerySelect = ({
  items,
}: GetDbClusterPayload): DbCluster[] =>
  items.map(({ ...props }) => ({
    ...props,
  }));

export const useDbClusters = (namespace: string) =>
  useQuery({
    queryKey: [DB_CLUSTERS_QUERY_KEY],
    queryFn: () => getDbClustersFn(namespace),
    refetchInterval: 5 * 1000,
    select: dbClustersQuerySelect,
  });

export const useDBClustersForNamespaces = () => {
  const { data: namespaces = [] } = useNamespaces();

  const queries = namespaces.map<
    UseQueryOptions<GetDbClusterPayload, unknown, DbCluster[]>
  >((namespace) => ({
    queryKey: [`${DB_CLUSTERS_QUERY_KEY}_${namespace}`],
    retry: false,
    queryFn: () => getDbClustersFn(namespace),
    refetchInterval: 5 * 1000,
    select: dbClustersQuerySelect,
  }));

  const queryResults = useQueries({ queries });
  const results: DbClusterForNamespaceResult[] = queryResults.map(
    (item, i) => ({
      namespace: namespaces[i],
      queryResult: item,
    })
  );

  return results;
};
