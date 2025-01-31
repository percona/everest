import { UseQueryResult } from '@tanstack/react-query';
import {
  GetBackupStoragesPayload,
  StorageType,
} from 'shared-types/backupStorages.types';
import { Messages } from './storage-locations.messages';
import { BackupStorageTableElement } from './storage-locations.types';

export const convertStoragesType = (value: StorageType) =>
  ({
    [StorageType.S3]: Messages.s3,
    [StorageType.GCS]: Messages.gcs,
    [StorageType.AZURE]: Messages.azure,
  })[value];

export const convertBackupStoragesPayloadToTableFormat = (
  data: UseQueryResult<GetBackupStoragesPayload, Error>[]
): BackupStorageTableElement[] => {
  const result: BackupStorageTableElement[] = [];
  data.forEach((item) => {
    const tableDataForNamespace: BackupStorageTableElement[] = item.isSuccess
      ? item.data.map((storage) => ({
          namespace: storage.namespace,
          name: storage.name,
          type: storage.type,
          bucketName: storage.bucketName,
          description: storage.description,
          url: storage.url,
          raw: storage,
        }))
      : [];
    result.push(...tableDataForNamespace);
  });
  return result;
};
