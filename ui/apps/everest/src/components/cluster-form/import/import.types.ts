export enum ImportFields {
  dataImporter = 'dataImporter',

  bucketName = 'bucketName',
  region = 'region',
  endpoint = 'endpoint',
  accessKey = 'accessKey',
  secretKey = 'secretKey',
  verifyTlS = 'verifyTlS',
  forcePathStyle = 'forcePathStyle',

  filePath = 'filePath',

  credentials = 'credentials',
}

export type SecretKey = {
  name: string;
  description: string;
};

export type DbCredentialsSectionProps = {
  secretKeys?: SecretKey[];
};
