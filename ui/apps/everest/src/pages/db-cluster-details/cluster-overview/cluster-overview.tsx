import { Stack } from '@mui/material';
import { dbEngineToDbType } from '@percona/utils';
import { useDbClusterCredentials } from 'hooks/api/db-cluster/useCreateDbCluster';
import { useParams } from 'react-router-dom';
import { ProxyExposeType } from 'shared-types/dbCluster.types';
import { ConnectionDetails, DatabaseDetails } from './cards';
import { useContext } from 'react';
import { DbClusterContext } from '../dbCluster.context';

export const ClusterOverview = () => {
  const { dbClusterName, namespace = '' } = useParams();
  const { dbCluster, isLoading: loadingCluster } = useContext(DbClusterContext);
  const { data: dbClusterDetails, isFetching: fetchingClusterDetails } =
    useDbClusterCredentials(dbClusterName || '', namespace, {
      enabled: !!dbClusterName,
    });

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={2}
      sx={{
        '& > *': {
          flexGrow: 1,
        },
      }}
    >
      {/* We force ! because while loading no info is shown */}
      <DatabaseDetails
        loading={loadingCluster}
        type={dbEngineToDbType(dbCluster?.spec.engine.type!)}
        name={dbCluster?.metadata.name!}
        namespace={dbCluster?.metadata.namespace!}
        version={dbCluster?.spec.engine.version!}
        numberOfNodes={dbCluster?.spec.engine.replicas!}
        cpu={dbCluster?.spec.engine.resources?.cpu!}
        memory={dbCluster?.spec.engine.resources?.memory!}
        disk={dbCluster?.spec.engine.storage.size!}
        backup={dbCluster?.spec?.backup}
        externalAccess={
          dbCluster?.spec.proxy.expose.type === ProxyExposeType.external
        }
        monitoring={dbCluster?.spec.monitoring.monitoringConfigName}
      />
      <ConnectionDetails
        loading={loadingCluster}
        loadingClusterDetails={fetchingClusterDetails}
        hostname={dbCluster?.status?.hostname!}
        port={dbCluster?.status?.port!}
        username={dbClusterDetails?.username!}
        password={dbClusterDetails?.password!}
        clusterName={dbCluster?.metadata.name}
        clusterNamespace={dbCluster?.metadata.namespace}
      />
    </Stack>
  );
};
