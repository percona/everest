import { DbType } from '@percona/types';
import { dbTypeToProxyType } from '@percona/utils';
import { CUSTOM_NR_UNITS_INPUT_VALUE } from 'components/cluster-form';
import { DbWizardType } from 'pages/database-form/database-form-schema';
import {
  DataSource,
  Proxy,
  ProxyExposeConfig,
  ProxyExposeType,
} from 'shared-types/dbCluster.types';

const getExposteConfig = (
  externalAccess: boolean,
  sourceRanges?: Array<{ sourceRange?: string }>
): ProxyExposeConfig => ({
  type: externalAccess ? ProxyExposeType.external : ProxyExposeType.internal,
  ...(!!externalAccess &&
    sourceRanges && {
      ipSourceRanges: sourceRanges.flatMap((source) =>
        source.sourceRange ? [source.sourceRange] : []
      ),
    }),
});

export const getProxySpec = (
  dbType: DbType,
  numberOfProxies: string,
  customNrOfProxies: string,
  externalAccess: boolean,
  cpu: number,
  memory: number,
  sharding: boolean,
  sourceRanges?: Array<{ sourceRange?: string }>
): Proxy | ProxyExposeConfig => {
  if (dbType === DbType.Mongo && !sharding) {
    return {
      expose: getExposteConfig(externalAccess, sourceRanges),
    } as unknown as ProxyExposeConfig;
  }
  const proxyNr = parseInt(
    numberOfProxies === CUSTOM_NR_UNITS_INPUT_VALUE
      ? customNrOfProxies
      : numberOfProxies,
    10
  );
  // const showResources =
  //   dbType !== DbType.Mongo || (dbType === DbType.Mongo && !sharding);

  return {
    type: dbTypeToProxyType(dbType),
    replicas: proxyNr,
    resources: {
      cpu: `${cpu}`,
      memory: `${memory}G`,
    },
    expose: getExposteConfig(externalAccess, sourceRanges),
  };
};

export const getDataSource = ({
  backupDataSource,
  dbPayload,
}: {
  backupDataSource?: DataSource;
  dbPayload: DbWizardType;
}) => {
  let dataSource = {};
  if (backupDataSource?.dbClusterBackupName) {
    dataSource = {
      dbClusterBackupName: backupDataSource.dbClusterBackupName,
      ...(backupDataSource?.pitr && {
        pitr: {
          date: backupDataSource.pitr.date,
          type: 'date',
        },
      }),
    };
  }
  if (dbPayload.dataImporter) {
    dataSource = {
      ...dataSource,
      dataImport: {
        dataImporterName: dbPayload.dataImporter,
        source: {
          path: dbPayload.filePath,
          s3: {
            accessKeyId: dbPayload.accessKey,
            bucket: dbPayload.bucketName,
            credentialsSecretName: `${dbPayload.dataImporter}-${dbPayload.dbName}-secret`,
            endpointURL: dbPayload.endpoint,
            region: dbPayload.region,
            secretAccessKey: dbPayload.secretKey,
            verifyTLS: dbPayload.verifyTlS,
            forcePathStyle: dbPayload.forcePathStyle,
          },
        },
      },
    };
  }
  return dataSource;
};
