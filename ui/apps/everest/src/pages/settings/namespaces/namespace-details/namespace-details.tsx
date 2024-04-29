import { useEffect, useState } from 'react';
import { DbToggleCard, ToggleButtonGroupInput } from '@percona/ui-lib';
import { dbEngineToDbType } from '@percona/utils';
import { useNavigate, useParams } from 'react-router-dom';
import BackNavigationText from 'components/back-navigation-text';
import { DbEngine } from 'shared-types/dbEngines.types';
import { useNamespace } from 'hooks/api/namespaces';
import { useDbEngines, useOperatorUpgrade } from 'hooks/api/db-engines';
import { NoMatch } from 'pages/404/NoMatch';
import { FormProvider, useForm } from 'react-hook-form';
import { Typography } from '@mui/material';
import UpgradeHeader from './upgrade-header';
import ClusterStatusTable from './cluster-status-table';
import UpgradeModal from './upgrade-modal';
import { useQueries } from '@tanstack/react-query';
import { getOperatorUpgradePreflight } from 'api/dbEngineApi';
import EngineChip from './engine-chip';

const NamespaceDetails = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const { namespace: namespaceName = '' } = useParams();
  // We keep track of the selected engine and its index in the dbEngines array, so we can use it to match against the preflight data
  const [selectedEngine, setSelectedEngine] = useState<{
    engine: DbEngine;
    index: number;
  }>();
  const { data: namespace, isLoading: loadingNamespace } = useNamespace(
    namespaceName,
    {
      enabled: !!namespaceName,
    }
  );
  const { data: dbEngines = [], refetch: refetchDbEngines } = useDbEngines(
    namespaceName,
    {
      enabled: !!namespace,
    }
  );

  const methods = useForm({
    defaultValues: {
      dbType: dbEngineToDbType(dbEngines[0]?.type),
    },
  });

  const targetVersion =
    !!selectedEngine && selectedEngine.engine.pendingOperatorUpgrades?.length
      ? selectedEngine?.engine.pendingOperatorUpgrades[0].targetVersion
      : '';

  const preflightQueriesResults = useQueries({
    queries: dbEngines.map((engine) => ({
      queryKey: ['dbEngineUpgradePreflight', namespaceName, engine.name],
      queryFn: () =>
        getOperatorUpgradePreflight(
          namespaceName,
          engine.name,
          engine.pendingOperatorUpgrades![0].targetVersion
        ),
      enabled:
        !!namespace &&
        !!dbEngines.length &&
        !!engine.pendingOperatorUpgrades?.length,
    })),
  });

  const { mutate: upgradeOperator } = useOperatorUpgrade(
    namespaceName,
    selectedEngine?.engine.name || '',
    targetVersion
  );
  const lastTargetVersion = selectedEngine?.engine.pendingOperatorUpgrades
    ?.length
    ? selectedEngine?.engine.pendingOperatorUpgrades[
        selectedEngine?.engine.pendingOperatorUpgrades?.length - 1
      ].targetVersion
    : '';
  const operatorIsUpgrading = !!selectedEngine?.engine.operatorUpgrade;

  const performUpgrade = () => {
    upgradeOperator(null, {
      onSuccess: () => {
        refetchDbEngines();
        setModalOpen(false);
      },
    });
  };

  useEffect(() => {
    if (dbEngines.length) {
      methods.setValue('dbType', dbEngineToDbType(dbEngines[0]?.type));
      setSelectedEngine({ engine: dbEngines[0], index: 0 });
    }
  }, [dbEngines, methods]);

  if (loadingNamespace) {
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
      />
      <FormProvider {...methods}>
        <ToggleButtonGroupInput
          name={'dbType'}
          toggleButtonGroupProps={{
            fullWidth: false,
            sx: { mb: 2, mt: 2, width: '50%' },
          }}
        >
          {dbEngines.map((engine, idx) => (
            <DbToggleCard
              key={engine.type}
              value={dbEngineToDbType(engine.type)}
              lowerContent={
                engine.pendingOperatorUpgrades?.length ? (
                  <EngineChip
                    preflightPayload={preflightQueriesResults[idx].data}
                  />
                ) : (
                  <Typography variant="body2">
                    version {engine.operatorVersion}
                  </Typography>
                )
              }
              onClick={() => {
                setSelectedEngine({ engine, index: idx });
              }}
            />
          ))}
        </ToggleButtonGroupInput>
      </FormProvider>
      {selectedEngine && (
        <>
          <UpgradeHeader
            upgradeAvailable={
              !!preflightQueriesResults[selectedEngine.index].data
            }
            upgrading={operatorIsUpgrading}
            pendingTasks={
              !!preflightQueriesResults[
                selectedEngine.index
              ].data?.databases.filter(
                (db) => db.pendingTask && db.pendingTask !== 'ready'
              ).length
            }
            onUpgrade={() => setModalOpen(true)}
            dbType={methods.getValues('dbType')}
            mt={2}
          />
          <ClusterStatusTable
            namespace={namespaceName}
            databases={
              preflightQueriesResults[selectedEngine.index].data?.databases ||
              []
            }
          />
        </>
      )}
      <UpgradeModal
        // TODO get values from API
        newVersion={lastTargetVersion}
        supportedVersions={['1.0.0', '2.0.0']}
        namespace={namespace}
        dbType={methods.getValues('dbType')}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={performUpgrade}
      />
    </>
  );
};

export default NamespaceDetails;
