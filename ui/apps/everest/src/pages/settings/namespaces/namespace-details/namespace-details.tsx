import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import BackNavigationText from 'components/back-navigation-text';
import { useNamespace } from 'hooks/api/namespaces';
import {
  useDbEngines,
  useOperatorUpgrade,
  useOperatorsUpgradePlan,
} from 'hooks/api/db-engines';
import { NoMatch } from 'pages/404/NoMatch';
import UpgradeHeader from './upgrade-header';
import ClusterStatusTable from './cluster-status-table';
import UpgradeModal from './upgrade-modal';
import { Stack, Typography } from '@mui/material';

const NamespaceDetails = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const { namespace: namespaceName = '' } = useParams();
  const { data: namespace, isLoading: loadingNamespace } = useNamespace(
    namespaceName,
    {
      enabled: !!namespaceName,
    }
  );
  const { data: dbEngines = [] } = useDbEngines(
    namespaceName,
    {
      enabled: !!namespace,
      refetchInterval: 2 * 1000,
    },
    true
  );
  const { data: operatorsUpgradePlan, isLoading: loadingOperatorsUpgradePlan } =
    useOperatorsUpgradePlan(namespaceName, {
      enabled: !!namespace,
    });

  const { mutate: upgradeOperator } = useOperatorUpgrade(namespaceName);

  const performUpgrade = () => {
    upgradeOperator(null, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['dbEngines', namespaceName],
        });
        queryClient.invalidateQueries({
          queryKey: ['operatorUpgradePlan', namespace],
        });
        setModalOpen(false);
      },
    });
  };

  if (loadingNamespace || loadingOperatorsUpgradePlan) {
    return null;
  }

  if (!namespace) {
    return <NoMatch />;
  }

  return (
    <>
      <BackNavigationText
        text={namespaceName}
        onBackClick={() => navigate('/settings/namespaces')}
        rightSlot={
          <Stack direction="row">
            {operatorsUpgradePlan?.upgrades.map((upgrade) => (
              <Typography
                key={upgrade.name}
                variant="body2"
              >{`${upgrade.name} v${upgrade.currentVersion} (Upgrade available)`}</Typography>
            ))}
            {operatorsUpgradePlan?.upToDate.map((operator) => (
              <Typography
                key={operator.name}
                variant="body2"
              >{`${operator} v${operator.currentVersion}`}</Typography>
            ))}
          </Stack>
        }
      />
      <UpgradeHeader
        onUpgrade={() => setModalOpen(true)}
        upgradeAvailable={!!operatorsUpgradePlan?.upgrades.length}
        pendingUpgradeTasks={!!operatorsUpgradePlan?.pendingActions.length}
        mt={2}
      />
      <ClusterStatusTable
        namespace={namespaceName}
        pendingActions={operatorsUpgradePlan?.pendingActions || []}
        dbEngines={dbEngines}
      />
      <UpgradeModal
        namespace={namespace}
        operatorsUpgradeTasks={operatorsUpgradePlan?.upgrades || []}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => performUpgrade()}
      />
    </>
  );
};

export default NamespaceDetails;
