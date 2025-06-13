import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import BackNavigationText from 'components/back-navigation-text';
import { useNamespace } from 'hooks/api/namespaces';
import {
  useDbEngines,
  useOperatorUpgrade,
  useOperatorsUpgradePlan,
} from 'hooks/api/db-engines';
import { useRBACPermissions } from 'hooks/rbac';
import { NoMatch } from 'pages/404/NoMatch';
import UpgradeHeader from './upgrade-header';
import ClusterStatusTable from './cluster-status-table';
import UpgradeModal from './upgrade-modal';
import OperatorVersionsHeader from './operator-versions-header';

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
  // TODO: Replace 'in-cluster' with actual cluster selection logic
  const { data: dbEngines = [] } = useDbEngines('in-cluster', namespaceName, {
    enabled: !!namespace,
    refetchInterval: 2 * 1000,
  }, true);
  const { data: operatorsUpgradePlan, isLoading: loadingOperatorsUpgradePlan } =
    useOperatorsUpgradePlan(namespaceName, dbEngines, {
      initialData: {
        upgrades: [],
        pendingActions: [],
        upToDate: [],
      },
      enabled: !!namespace && dbEngines.length > 0,
      refetchInterval: 5 * 1000,
    });
  const operatorNamesWithUpgrades = useMemo(
    () =>
      (operatorsUpgradePlan?.upgrades || []).map(
        (upgrade) => `${namespaceName}/${upgrade.name}`
      ) || [],
    [namespaceName, operatorsUpgradePlan]
  );

  const { mutate: upgradeOperator } = useOperatorUpgrade(namespaceName);
  const { canUpdate } = useRBACPermissions(
    'database-engines',
    operatorNamesWithUpgrades
  );

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
          <OperatorVersionsHeader
            operatorsUpgradePlan={operatorsUpgradePlan!}
          />
        }
      />
      <UpgradeHeader
        onUpgrade={() => setModalOpen(true)}
        upgradeAvailable={!!operatorsUpgradePlan?.upgrades.length}
        upgradeAllowed={canUpdate}
        pendingUpgradeTasks={
          !!operatorsUpgradePlan?.pendingActions.some(
            (action) => action.pendingTask !== 'ready'
          )
        }
        mt={3}
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
