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

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDbClusterFn } from 'api/dbClusterApi';

interface DeleteDbClusterPayload {
  dbClusterName: string;
  namespace: string;
  cleanupBackupStorage: boolean;
}

export const useDeleteDbCluster = (cluster: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dbClusterName,
      namespace,
      cleanupBackupStorage,
    }: DeleteDbClusterPayload) => {
      return deleteDbClusterFn(dbClusterName, namespace, cleanupBackupStorage, cluster);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dbClusters']
      });
    },
  });
};
