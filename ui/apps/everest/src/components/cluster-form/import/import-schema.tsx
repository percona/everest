import { z } from 'zod';
import { ImportFields } from './import.types';

const MAX_IMPORT_FIELD_LENGTH = 250;

const basicStringValidation = () =>
  z.string().min(1).max(MAX_IMPORT_FIELD_LENGTH);

const dataImporterSchemeObject = {
  [ImportFields.dataImporter]: z.string().max(MAX_IMPORT_FIELD_LENGTH),
};

export const dataImporterSchema = z.object(dataImporterSchemeObject);

const s3SchemaObject = {
  [ImportFields.bucketName]: basicStringValidation(),
  [ImportFields.region]: basicStringValidation(),
  [ImportFields.endpoint]: basicStringValidation(),
  [ImportFields.accessKey]: basicStringValidation(),
  [ImportFields.secretKey]: basicStringValidation(),
  [ImportFields.verifyTlS]: z.boolean(),
};
export const s3Schema = z.object(s3SchemaObject);

const credentialsSchemaObject = {
  [ImportFields.root]: basicStringValidation(),
  [ImportFields.proxyadmin]: basicStringValidation(),
  [ImportFields.xtrabackup]: basicStringValidation(),
  [ImportFields.monitor]: basicStringValidation(),
  [ImportFields.pmmServerPassword]: basicStringValidation(),
  [ImportFields.operatorAdmin]: basicStringValidation(),
  [ImportFields.replication]: basicStringValidation(),
};
export const dbCredentialsSchema = z.object(credentialsSchemaObject);

const filePathSchemaObject = {
  [ImportFields.filePath]: z
    .string()
    .max(MAX_IMPORT_FIELD_LENGTH)
    .regex(/^\/[\S]*$/),
};
export const filePathSchema = z.object(filePathSchemaObject);

export const importStepSchema = z
  .object({
    ...dataImporterSchemeObject,
    ...s3SchemaObject,
    // ...credentialsSchemaObject,
    ...filePathSchemaObject,
  })
  .superRefine(() => {});
