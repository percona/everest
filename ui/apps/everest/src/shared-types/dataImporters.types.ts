export type DataImporter = {
  metadata: { name: string };
  spec: {
    displayName: string;
    description: string;
    supportedEngines: string[];
    jobSpec: { image: string; command: string[] };
    databaseClusterConstraints: { requiredFields: string[] };
  };
};

export type DataImporters = {
  metadata: { resourceVersion: string };
  items: DataImporter[];
};

export type DataImportJob = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    targetClusterName: string;
    dataImporterName: string;
    source: {
      s3: {
        bucket: string;
        region: string;
        endpointURL: string;
        verifyTLS: boolean;
        forcePathStyle: boolean;
        credentialsSecretName: string;
      };
    };
  };
  status: {
    state: string;
    startedAt: string;
    lastObservedGeneration: number;
    jobName: string;
  };
};

export type DataImportJobs = {
  metadata: { resourceVersion: string };
  items: DataImportJob[];
};
