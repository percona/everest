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
  data: UseQueryResult<GetBackupStoragesPayload, Error>[],
  clusterMap: { [index: number]: string }
): BackupStorageTableElement[] => {
  const result: BackupStorageTableElement[] = [];
  data.forEach((item, index) => {
    const tableDataForNamespace: BackupStorageTableElement[] = item.isSuccess
      ? item.data.map((storage) => ({
          namespace: storage.namespace,
          name: storage.name,
          type: storage.type,
          bucketName: storage.bucketName,
          description: storage.description,
          url: storage.url,
          region: storage.region,
          accessKey: storage.accessKey,
          secretKey: storage.secretKey,
          verifyTLS: storage.verifyTLS,
          forcePathStyle: storage.forcePathStyle,
          cluster: clusterMap[index] || 'in-cluster',
          raw: storage,
        }))
      : [];
    result.push(...tableDataForNamespace);
  });
  return result;
};
