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

import { useMutation, UseMutationOptions } from 'react-query';
import { createDbClusterRestore } from 'api/restores';
import { generateShortUID } from 'pages/database-form/steps/first/utils';

export const useDbClusterRestoreFromBackup = (
  dbClusterName: string,
  options?: UseMutationOptions<unknown, unknown, unknown, unknown>
) => {
  return useMutation(
    ({ backupName, namespace }: { backupName: string; namespace: string }) =>
      createDbClusterRestore(
        {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterRestore',
          metadata: {
            name: `restore-${generateShortUID()}`,
          },
          spec: {
            dbClusterName,
            dataSource: {
              dbClusterBackupName: backupName,
            },
          },
        },
        namespace
      ),
    { ...options }
  );
};

export const useDbClusterRestoreFromPointInTime = (
  dbClusterName: string,
  options?: UseMutationOptions<unknown, unknown, unknown, unknown>
) => {
  return useMutation(
    ({
      pointInTimeDate,
      backupName,
      namespace,
    }: {
      pointInTimeDate: string;
      backupName: string;
      namespace: string;
    }) =>
      createDbClusterRestore(
        {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterRestore',
          metadata: {
            name: `restore-${generateShortUID()}`,
          },
          spec: {
            dbClusterName,
            dataSource: {
              dbClusterBackupName: backupName,
              pitr: {
                date: pointInTimeDate,
              },
            },
          },
        },
        namespace
      ),
    { ...options }
  );
};
