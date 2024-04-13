import { DbToggleCard, ToggleButtonGroupInput } from '@percona/ui-lib';
import { dbEngineToDbType } from '@percona/utils';
import { useNavigate, useParams } from 'react-router-dom';
import BackNavigationText from 'components/back-navigation-text';
import { useNamespace } from 'hooks/api/namespaces';
import { useDbEngines } from 'hooks/api/db-engines';
import { NoMatch } from 'pages/404/NoMatch';
import { FormProvider, useForm } from 'react-hook-form';
import { Typography } from '@mui/material';
import { useEffect } from 'react';
import UpgradeHeader from './upgrade-header';

const NamespaceDetails = () => {
  const navigate = useNavigate();
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
            sx: { mb: 2, mt: 2, width: '40%' },
          }}
        >
          {dbEngines.map(({ type, operatorVersion }) => (
            <DbToggleCard
              key={type}
              value={dbEngineToDbType(type)}
              lowerContent={
                <Typography variant="body2" mt={1}>
                  version {operatorVersion}
                </Typography>
              }
            />
          ))}
        </ToggleButtonGroupInput>
      </FormProvider>
      <UpgradeHeader status="upgrade-available" mt={2} />
    </>
  );
};

export default NamespaceDetails;
