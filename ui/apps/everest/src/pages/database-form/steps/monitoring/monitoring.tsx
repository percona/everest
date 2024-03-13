import { FormGroup } from '@mui/material';
import { AutoCompleteInput, SwitchInput } from '@percona/ui-lib';
import { useEffect, useState } from 'react';
import {
  MONITORING_INSTANCES_QUERY_KEY,
  useCreateMonitoringInstance,
  useMonitoringInstancesListByNamespace,
} from 'hooks/api/monitoring/useMonitoringInstancesList';
import { CreateEditEndpointModal } from 'pages/settings/monitoring-endpoints/createEditModal/create-edit-modal.tsx';
import { EndpointFormType } from 'pages/settings/monitoring-endpoints/createEditModal/create-edit-modal.types.ts';
import { useFormContext } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { updateDataAfterCreate } from 'utils/generalOptimisticDataUpdate.ts';
import { DbWizardFormFields } from '../../database-form.types';
import { useDatabasePageMode } from '../../useDatabasePageMode';
import { StepHeader } from '../step-header/step-header.tsx';
import { Messages } from './monitoring.messages';
import ActionableAlert from 'components/actionable-alert';

export const Monitoring = () => {
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const queryClient = useQueryClient();
  const { watch, getValues, trigger } = useFormContext();
  const monitoring: boolean = watch(DbWizardFormFields.monitoring);
  const selectedNamespace = getValues(DbWizardFormFields.k8sNamespace);

  const mode = useDatabasePageMode();
  const { mutate: createMonitoringInstance, isPending: creatingInstance } =
    useCreateMonitoringInstance();
  const { setValue } = useFormContext();

  const {
    data: monitoringInstances = [],
    isFetching: monitoringInstancesLoading,
  } = useMonitoringInstancesListByNamespace(selectedNamespace);

  const monitoringInstancesOptions = monitoringInstances.map(
    (item) => item.name
  );
  const getInstanceOptionLabel = (instanceName: string) => {
    const instance = monitoringInstances?.find(
      (inst) => inst.name === instanceName
    );

    return instance ? `${instance.name} (${instance.url})` : '';
  };

  const handleCloseModal = () => {
    setOpenCreateEditModal(false);
  };

  const handleSubmitModal = (
    _: unknown,
    { name, url, allowedNamespaces, ...pmmData }: EndpointFormType
  ) => {
    createMonitoringInstance(
      { name, url, type: 'pmm', allowedNamespaces, pmm: { ...pmmData } },
      {
        onSuccess: (newInstance) => {
          updateDataAfterCreate(
            queryClient,
            MONITORING_INSTANCES_QUERY_KEY
          )(newInstance);
          handleCloseModal();
        },
      }
    );
  };

  useEffect(() => {
    const selectedInstance = getValues(DbWizardFormFields.monitoringInstance);

    trigger();

    if (!monitoringInstances?.length) {
      return;
    }

    if (mode === 'new') {
      if (monitoring) {
        setValue(
          DbWizardFormFields.monitoringInstance,
          monitoringInstances[0].name
        );
      }
    } else if (!selectedInstance) {
      setValue(
        DbWizardFormFields.monitoringInstance,
        monitoringInstances[0].name
      );
    }
  }, [monitoring, monitoringInstances]);

  return (
    <>
      <StepHeader
        pageTitle={Messages.monitoring}
        pageDescription={Messages.caption}
      />
      {!monitoringInstances?.length && (
        <ActionableAlert
          message={Messages.alertText(selectedNamespace)}
          buttonMessage={Messages.addMonitoringEndpoint}
          data-testid="monitoring-warning"
          onClick={() => setOpenCreateEditModal(true)}
        />
      )}
      <FormGroup sx={{ mt: 2 }}>
        <SwitchInput
          label={Messages.monitoringEnabled}
          name={DbWizardFormFields.monitoring}
          switchFieldProps={{
            disabled: !monitoringInstances?.length,
          }}
        />
        {monitoring && !!monitoringInstances?.length && (
          <AutoCompleteInput
            name={DbWizardFormFields.monitoringInstance}
            label={Messages.monitoringInstanceLabel}
            loading={monitoringInstancesLoading}
            options={monitoringInstancesOptions}
            autoCompleteProps={{
              disableClearable: true,
              renderOption: (props, option) => (
                <li {...props}>{getInstanceOptionLabel(option)}</li>
              ),
            }}
          />
        )}
        {openCreateEditModal && (
          <CreateEditEndpointModal
            open={openCreateEditModal}
            handleClose={handleCloseModal}
            handleSubmit={handleSubmitModal}
            isLoading={creatingInstance}
          />
        )}
      </FormGroup>
    </>
  );
};
