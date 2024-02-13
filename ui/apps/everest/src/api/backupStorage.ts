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
  BackupStorage,
  GetBackupStoragesPayload,
} from 'shared-types/backupStorages.types';
import { api } from './api';

export const getBackupStoragesFn = async () => {
  const response = await api.get<GetBackupStoragesPayload>('backup-storages');
  return response.data;
};

export const createBackupStorageFn = async (formData: BackupStorage) => {
  const response = await api.post('backup-storages', formData);

  return response.data;
};

export const editBackupStorageFn = async (formData: BackupStorage) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { name, type, ...editableFormData } = formData;
  const response = await api.patch(
    `backup-storages/${formData.name}`,
    editableFormData
  );

  return response.data;
};

export const deleteBackupStorageFn = async (backupStorageId: string) => {
  const response = await api.delete(`backup-storages/${backupStorageId}`);

  return response.data;
};
