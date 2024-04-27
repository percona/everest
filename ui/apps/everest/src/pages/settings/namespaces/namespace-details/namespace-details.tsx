import { useEffect, useState } from 'react';
import { DbToggleCard, ToggleButtonGroupInput } from '@percona/ui-lib';
import { dbEngineToDbType, dbTypeToDbEngine } from '@percona/utils';
import { DbType } from '@percona/types';
import { useNavigate, useParams } from 'react-router-dom';
import BackNavigationText from 'components/back-navigation-text';
import { useNamespace } from 'hooks/api/namespaces';
import {
  useDbEngineUpgradePreflight,
  useDbEngines,
} from 'hooks/api/db-engines';
import { NoMatch } from 'pages/404/NoMatch';
import { FormProvider, useForm } from 'react-hook-form';
import { Chip, Typography } from '@mui/material';
import UpgradeHeader from './upgrade-header';
import ClusterStatusTable from './cluster-status-table';
import UpgradeModal from './upgrade-modal';

const NamespaceDetails = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const { namespace: namespaceName = '' } = useParams();
  const { data: namespace, isLoading: loadingNamespace } = useNamespace(
    namespaceName,
    {
      enabled: !!namespaceName,
    }
  );
  const { data: dbEngines = [] } = useDbEngines(namespaceName, {
    enabled: !!namespace,
  });

  const methods = useForm({
    defaultValues: {
      dbType: dbEngineToDbType(dbEngines[0]?.type),
    },
  });

  const selectedEngine = dbEngines.find(
    (engine) =>
      engine.type === dbTypeToDbEngine(methods.watch('dbType') as DbType)
  );

  console.log(selectedEngine);

  const { data: preflight } = useDbEngineUpgradePreflight(
    namespaceName,
    selectedEngine?.name || '',
    !!selectedEngine && selectedEngine.pendingOperatorUpgrades?.length
      ? selectedEngine?.pendingOperatorUpgrades[0].targetVersion
      : '',
    {
      enabled:
        !!selectedEngine && !!selectedEngine.pendingOperatorUpgrades?.length,
    }
  );

  console.log(preflight);

  useEffect(() => {
    if (dbEngines.length) {
      methods.setValue('dbType', dbEngineToDbType(dbEngines[0]?.type));
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
          {dbEngines.map(
            ({ type, operatorVersion, pendingOperatorUpgrades }) => (
              <DbToggleCard
                key={type}
                value={dbEngineToDbType(type)}
                lowerContent={
                  pendingOperatorUpgrades?.length ? (
                    <Chip color="error" label="Upgrade available" />
                  ) : (
                    <Typography variant="body2">
                      version {operatorVersion}
                    </Typography>
                  )
                }
              />
            )
          )}
        </ToggleButtonGroupInput>
      </FormProvider>
      <UpgradeHeader
        upgradeAvailable={!!preflight}
        pendingTasks={
          !!preflight?.databases.filter((db) => db.pendingTask).length
        }
        onUpgrade={() => setModalOpen(true)}
        dbType={methods.getValues('dbType')}
        mt={2}
      />
      <ClusterStatusTable
        namespace={namespaceName}
        databases={preflight?.databases || []}
      />
      <UpgradeModal
        // TODO get values from API
        newVersion="5.0.0"
        supportedVersions={['1.0.0', '2.0.0']}
        namespace={namespace}
        dbType={methods.getValues('dbType')}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => {}}
      />
    </>
  );
};

export default NamespaceDetails;
