import { Alert, Box, Skeleton, Tab, Tabs } from '@mui/material';
import {
  Link,
  Outlet,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { NoMatch } from '../404/NoMatch';
import BackNavigationText from 'components/back-navigation-text';
import { DbActionButton } from './db-action-button';
import { Messages } from './db-cluster-details.messages';
import { DBClusterDetailsTabs } from './db-cluster-details.types';
import { DbClusterStatus } from 'shared-types/dbCluster.types';
import { DbClusterContext } from './dbCluster.context';
import { useContext } from 'react';
import { useRBACPermissions } from 'hooks/rbac';

export const DbClusterDetails = () => {
  const { dbClusterName = '' } = useParams();

  const { dbCluster, isLoading } = useContext(DbClusterContext);
  const routeMatch = useMatch('/databases/:namespace/:dbClusterName/:tabs');
  const navigate = useNavigate();
  const currentTab = routeMatch?.params?.tabs;

  const { canUpdate, canDelete } = useRBACPermissions(
    'database-clusters',
    `${dbCluster?.metadata.namespace}/${dbCluster?.metadata.name}`
  );
  const { canCreate: canCreateRestore } = useRBACPermissions(
    'database-cluster-restores',
    `${dbCluster?.metadata.namespace}/*`
  );

  const { canRead: canReadCredentials } = useRBACPermissions(
    'database-cluster-credentials',
    `${dbCluster?.metadata.namespace}/${dbCluster?.metadata.name}`
  );
  const canRestore = canCreateRestore && canReadCredentials;

  if (isLoading) {
    return (
      <>
        <Skeleton variant="rectangular" />
        <Skeleton variant="rectangular" />
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton variant="rectangular" />
      </>
    );
  }

  // We went through the array and know the cluster is not there. Safe to show 404
  if (!dbCluster) {
    return <NoMatch />;
  }

  // All clear, show the cluster data
  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          justifyContent: 'flex-start',
          mb: 1,
        }}
      >
        <BackNavigationText
          text={dbClusterName!}
          onBackClick={() => navigate('/databases')}
        />
        {/* At this point, loading is done and we either have the cluster or not */}
        <>
          {canUpdate || canDelete || canRestore ? (
            <DbActionButton
              dbCluster={dbCluster!}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          ) : undefined}
        </>
      </Box>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 1,
        }}
      >
        <Tabs
          value={currentTab}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="nav tabs"
        >
          {Object.keys(DBClusterDetailsTabs).map((item) => (
            <Tab
              // @ts-ignore
              label={Messages[item]}
              // @ts-ignore
              key={DBClusterDetailsTabs[item]}
              // @ts-ignore
              value={DBClusterDetailsTabs[item]}
              // @ts-ignore
              to={DBClusterDetailsTabs[item]}
              component={Link}
              data-testid={`${
                DBClusterDetailsTabs[item as DBClusterDetailsTabs]
              }`}
            />
          ))}
        </Tabs>
      </Box>
      {dbCluster.status?.status === DbClusterStatus.restoring && (
        <Alert severity="warning" sx={{ my: 1 }}>
          {Messages.restoringDb}
        </Alert>
      )}
      <Outlet />
    </Box>
  );
};
