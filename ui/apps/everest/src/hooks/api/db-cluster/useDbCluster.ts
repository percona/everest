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

import { useQuery } from '@tanstack/react-query';
import { DbCluster } from 'shared-types/dbCluster.types';

import { getDbClusterFn } from 'api/dbClusterApi';
import { PerconaQueryOptions } from 'shared-types/query.types';
import cronConverter from 'utils/cron-converter';

export const DB_CLUSTER_QUERY = 'dbCluster';

export const useDbCluster = (
  dbClusterName: string,
  namespace: string,
  options?: PerconaQueryOptions<DbCluster, unknown, DbCluster>
) =>
  useQuery<DbCluster, unknown, DbCluster>({
    queryKey: [DB_CLUSTER_QUERY, dbClusterName],
    queryFn: () => getDbClusterFn(dbClusterName, namespace),
    select: (cluster) => ({
      ...cluster,
      spec: {
        ...cluster.spec,
        ...(cluster.spec?.backup?.schedules && {
          backup: {
            ...cluster.spec.backup,
            schedules: cluster.spec.backup.schedules.map((schedule) => ({
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
    }),
    ...options,
  });
