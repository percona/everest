import { DbType } from '@percona/types';
import { useFormContext } from 'react-hook-form';
import { DbWizardFormFields } from 'consts';
import { useDatabasePageMode } from '../../../useDatabasePageMode.ts';
import { StepHeader } from '../step-header/step-header.tsx';
import { Messages } from './resources-step.messages.ts';
import { ResourcesForm } from 'components/cluster-form';

export const ResourcesStep = () => {
  const { watch } = useFormContext();
  const mode = useDatabasePageMode();
  const dbType: DbType = watch(DbWizardFormFields.dbType);
  const shardingEnabled = watch(DbWizardFormFields.sharding);

  return (
    <>
      <StepHeader
        pageTitle={Messages.pageTitle}
        pageDescription={Messages.pageDescription}
      />
      <ResourcesForm
        dbType={dbType}
        pairProxiesWithNodes={mode !== 'edit'}
        disableDiskInput={mode === 'edit'}
        allowDiskInputUpdate={mode !== 'edit'}
        showSharding={dbType === DbType.Mongo}
        hideProxies={dbType === DbType.Mongo && !shardingEnabled}
      />
    </>
  );
};
