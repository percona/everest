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

import { useMutation, UseMutationOptions, useQuery } from 'react-query';
import {
  createBackupStorageFn,
  deleteBackupStorageFn,
  editBackupStorageFn,
  getBackupStoragesFn,
} from 'api/backupStorage';
import {
  BackupStorage,
  GetBackupStoragesPayload,
} from 'shared-types/backupStorages.types';

export const BACKUP_STORAGES_QUERY_KEY = 'backupStorages';

export const useBackupStorages = () => {
  return useQuery<GetBackupStoragesPayload, unknown, BackupStorage[]>(
    BACKUP_STORAGES_QUERY_KEY,
    () => getBackupStoragesFn()
  );
};

export const useCreateBackupStorage = (
  options?: UseMutationOptions<unknown, unknown, BackupStorage, unknown>
) => {
  return useMutation(
    (payload: BackupStorage) => createBackupStorageFn(payload),
    { ...options }
  );
};

export const useEditBackupStorage = (
  options?: UseMutationOptions<unknown, unknown, BackupStorage, unknown>
) => {
  return useMutation((payload: BackupStorage) => editBackupStorageFn(payload), {
    ...options,
  });
};

export const useDeleteBackupStorage = (
  options?: UseMutationOptions<unknown, unknown, string, unknown>
) => {
  return useMutation((payload: string) => deleteBackupStorageFn(payload), {
    ...options,
  });
};
