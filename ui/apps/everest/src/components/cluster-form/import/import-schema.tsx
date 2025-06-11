import { z } from 'zod';
import { ImportFields } from './import.types';

const dataImporterSchemeObject = {
  [ImportFields.dataImporter]: z.string(),
};

export const dataImporterSchema = z.object(dataImporterSchemeObject);

const s3SchemaObject = {
  [ImportFields.bucketName]: z.string().min(1),
  [ImportFields.region]: z.string().min(1),
  [ImportFields.endpoint]: z.string().min(1),
  [ImportFields.accessKey]: z.string().min(1),
  [ImportFields.secretKey]: z.string().min(1),
  [ImportFields.label]: z.boolean(),
};
export const s3Schema = z.object(s3SchemaObject);

const credentialsSchemaObject = {
  [ImportFields.root]: z.string().min(1),
  [ImportFields.proxyadmin]: z.string().min(1),
  [ImportFields.xtrabackup]: z.string().min(1),
  [ImportFields.monitor]: z.string().min(1),
  [ImportFields.pmmServerPassword]: z.string().min(1),
  [ImportFields.operatorAdmin]: z.string().min(1),
  [ImportFields.replication]: z.string().min(1),
};
export const credentialsSchema = z.object(credentialsSchemaObject);

const filePathSchemaObject = { [ImportFields.filePath]: z.string() };
export const filePathSchema = z.object(filePathSchemaObject);

const configSchemaObject = {
  [ImportFields.recoveryTarget]: z.string().min(1),
  [ImportFields.recoveryTargetLSN]: z.string().min(1),
  [ImportFields.recoveryTargetXID]: z.string().min(1),
  [ImportFields.recoveryTargetTime]: z.string().min(1),
  [ImportFields.recoveryTargetName]: z.string().min(1),
};
export const configSchema = z.object(configSchemaObject);

export const importStepSchema = z
  .object({
    ...dataImporterSchemeObject,
    ...s3SchemaObject,
    ...credentialsSchemaObject,
    ...filePathSchemaObject,
    ...configSchemaObject,
  })
  .superRefine(() => {});
