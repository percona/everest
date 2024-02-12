import { StorageType } from 'shared-types/backupStorages.types';
import { Messages } from './storage-locations.messages';

export const convertStoragesType = (value: StorageType) =>
  ({
    [StorageType.S3]: Messages.s3,
    [StorageType.GCS]: Messages.gcs,
    [StorageType.AZURE]: Messages.azure,
  })[value];
