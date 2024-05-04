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

import { useQueries, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { GetNamespacesPayload } from 'shared-types/namespaces.types';
import { getNamespacesFn } from 'api/namespaces';
import { dbEnginesQuerySelect } from '../db-engines/useDbEngines';
import { getDbEnginesFn } from 'api/dbEngineApi';
import { DbEngine, GetDbEnginesPayload } from 'shared-types/dbEngines.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const NAMESPACES_QUERY_KEY = 'namespace';

export const useNamespaces = () =>
  useQuery<GetNamespacesPayload, unknown, string[]>({
    queryKey: [NAMESPACES_QUERY_KEY],
    queryFn: getNamespacesFn,
  });

export const useDBEnginesForNamespaces = (retrieveUpgradingEngines = false) => {
  const { data: namespaces = [] } = useNamespaces();

  const queries = namespaces.map<
    UseQueryOptions<GetDbEnginesPayload, unknown, DbEngine[]>
  >((namespace) => ({
    queryKey: [`dbEngines_${namespace}`],
    retry: false,
    queryFn: () => getDbEnginesFn(namespace),
    select: (data) => dbEnginesQuerySelect(data, retrieveUpgradingEngines),
  }));

  const queryResults = useQueries({
    queries,
  });
  const results = queryResults.map((item, i) => ({
    namespace: namespaces[i],
    ...item,
  }));
  return results;
};

export const useNamespace = (
  namespace: string,
  options?: PerconaQueryOptions<
    GetNamespacesPayload,
    unknown,
    string | undefined
  >
) =>
  useQuery<GetNamespacesPayload, unknown, string | undefined>({
    queryKey: [NAMESPACES_QUERY_KEY],
    queryFn: getNamespacesFn,
    select: (data) => data.find((item) => item === namespace),
    ...options,
  });
