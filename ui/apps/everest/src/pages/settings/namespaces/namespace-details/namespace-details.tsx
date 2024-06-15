import { useEffect, useState } from 'react';
import { DbToggleCard, ToggleButtonGroupInput } from '@percona/ui-lib';
import { dbEngineToDbType, dbTypeToDbEngine } from '@percona/utils';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import BackNavigationText from 'components/back-navigation-text';
import {
  DbEngine,
  DbEngineStatus,
  GetDbEnginesPayload,
} from 'shared-types/dbEngines.types';
import { useNamespace } from 'hooks/api/namespaces';
import { useDbEngines, useOperatorUpgrade } from 'hooks/api/db-engines';
import { NoMatch } from 'pages/404/NoMatch';
import { FormProvider, useForm } from 'react-hook-form';
import UpgradeHeader from './upgrade-header';
import ClusterStatusTable from './cluster-status-table';
import UpgradeModal from './upgrade-modal';
import {
  getOperatorUpgradePreflight,
  getOperatorVersions,
} from 'api/dbEngineApi';
import EngineLowerContent from './engine-lower-content';

const NamespaceDetails = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const { namespace: namespaceName = '' } = useParams();
  const [selectedEngineIdx, setSelectedEngineIdx] = useState<number>();
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

  const methods = useForm({
    defaultValues: {
      dbType: dbEngineToDbType(dbEngines[0]?.type),
    },
  });

  const selectedEngine: DbEngine | null =
    selectedEngineIdx !== undefined ? dbEngines[selectedEngineIdx] : null;

  const targetVersion =
    !!selectedEngine && selectedEngine.pendingOperatorUpgrades?.length
      ? selectedEngine?.pendingOperatorUpgrades[0].targetVersion
      : '';

  const someEngineIsUpgrading = dbEngines.some(
    (engine) => engine.status === DbEngineStatus.UPGRADING
  );

  const preflightQueriesResults = useQueries({
    queries: dbEngines.map((engine) => ({
      queryKey: ['dbEngineUpgradePreflight', namespaceName, engine.name],
      refetchInterval: 5 * 1000,
      queryFn: () =>
        engine.pendingOperatorUpgrades?.length
          ? getOperatorUpgradePreflight(
              namespaceName,
              engine.name,
              engine.pendingOperatorUpgrades[0].targetVersion
            )
          : getOperatorVersions(namespaceName, engine.name),
      enabled: !!namespace && !!dbEngines.length && !someEngineIsUpgrading,
    })),
  });

  const { mutate: upgradeOperator } = useOperatorUpgrade(
    namespaceName,
    selectedEngine?.name || '',
    targetVersion
  );
  const lastTargetVersion = selectedEngine?.pendingOperatorUpgrades?.length
    ? selectedEngine?.pendingOperatorUpgrades[
        selectedEngine?.pendingOperatorUpgrades?.length - 1
      ].targetVersion
    : '';

  const performUpgrade = (engineName: string) => {
    upgradeOperator(null, {
      onSuccess: () => {
        queryClient.setQueryData<GetDbEnginesPayload>(
          ['dbEngines', namespaceName],
          (oldData) => {
            if (!oldData) {
              return oldData;
            }

            return {
              items: oldData.items.map((engine) => {
                if (engine.metadata.name === engineName && !!engine.status) {
                  return {
                    ...engine,
                    status: {
                      ...engine.status,
                      pendingOperatorUpgrades: undefined,
                      status: DbEngineStatus.UPGRADING,
                      operatorUpgrade: {
                        startedAt: new Date().toISOString(),
                        targetVersion,
                      },
                    },
                  };
                }
                return engine;
              }),
            };
          }
        );
        setModalOpen(false);
      },
    });
  };

  useEffect(() => {
    if (dbEngines.length && !selectedEngine) {
      methods.setValue('dbType', dbEngineToDbType(dbEngines[0]?.type));
      setSelectedEngineIdx(0);
    }
  }, [dbEngines, methods, selectedEngine]);

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
              disabled={someEngineIsUpgrading}
              key={engine.type}
              value={dbEngineToDbType(engine.type)}
              lowerContent={
                <EngineLowerContent
                  engine={engine}
                  preflightPayload={preflightQueriesResults[idx].data}
                />
              }
              onClick={() => {
                setSelectedEngineIdx(idx);
              }}
            />
          ))}
        </ToggleButtonGroupInput>
      </FormProvider>

      {selectedEngineIdx !== undefined && selectedEngine && (
        <>
          <UpgradeHeader
            engine={selectedEngine}
            preflightPayload={preflightQueriesResults[selectedEngineIdx].data}
            onUpgrade={() => setModalOpen(true)}
            mt={2}
          />
          <ClusterStatusTable
            namespace={namespaceName}
            databases={
              preflightQueriesResults[selectedEngineIdx].data?.databases || []
            }
          />
        </>
      )}
      <UpgradeModal
        // TODO get values from API
        newVersion={lastTargetVersion}
        namespace={namespace}
        dbType={dbTypeToDbEngine(methods.getValues('dbType'))}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => performUpgrade(selectedEngine!.name)}
      />
    </>
  );
};

export default NamespaceDetails;
