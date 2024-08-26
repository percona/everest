import { FormGroup } from '@mui/material';
import { AutoCompleteInput, SwitchInput } from '@percona/ui-lib';
import { useEffect, useState, useMemo } from 'react';
import {
  MONITORING_INSTANCES_QUERY_KEY,
  useCreateMonitoringInstance,
  useMonitoringInstancesList,
} from 'hooks/api/monitoring/useMonitoringInstancesList';
import { CreateEditEndpointModal } from 'pages/settings/monitoring-endpoints/createEditModal/create-edit-modal.tsx';
import { EndpointFormType } from 'pages/settings/monitoring-endpoints/createEditModal/create-edit-modal.types.ts';
import { useFormContext } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { updateDataAfterCreate } from 'utils/generalOptimisticDataUpdate.ts';
import { DbWizardFormFields } from 'consts.ts';
import { useDatabasePageMode } from '../../../useDatabasePageMode.ts';
import { StepHeader } from '../step-header/step-header.tsx';
import { Messages } from './monitoring.messages.ts';
import ActionableAlert from 'components/actionable-alert';

export const Monitoring = () => {
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const queryClient = useQueryClient();
  const { watch, getValues } = useFormContext();
  const monitoring = watch(DbWizardFormFields.monitoring);
  const selectedNamespace = watch(DbWizardFormFields.k8sNamespace);

  const mode = useDatabasePageMode();
  const { mutate: createMonitoringInstance, isPending: creatingInstance } =
    useCreateMonitoringInstance();
  const { setValue } = useFormContext();

  const { data: monitoringInstances, isFetching: monitoringInstancesLoading } =
    useMonitoringInstancesList();

  const availableMonitoringInstances = useMemo(
    () =>
      (monitoringInstances || []).filter((item) =>
        item.allowedNamespaces.includes(selectedNamespace)
      ),
    [monitoringInstances, selectedNamespace]
  );

  const monitoringInstancesOptions = availableMonitoringInstances.map(
    (item) => item.name
  );
  const getInstanceOptionLabel = (instanceName: string) => {
    const instance = availableMonitoringInstances?.find(
      (inst) => inst.name === instanceName
    );

    return instance ? `${instance.name} (${instance.url})` : '';
  };

  const handleCloseModal = () => {
    setOpenCreateEditModal(false);
  };

  const handleSubmitModal = (
    // @ts-ignore
    _,
    { name, url, allowedNamespaces, verifyTLS, ...pmmData }: EndpointFormType
  ) => {
    createMonitoringInstance(
      {
        name,
        url,
        type: 'pmm',
        allowedNamespaces,
        verifyTLS,
        pmm: { ...pmmData },
      },
      {
        onSuccess: (newInstance) => {
          updateDataAfterCreate(queryClient, [MONITORING_INSTANCES_QUERY_KEY])(
            newInstance
          );
          handleCloseModal();
        },
      }
    );
  };

  useEffect(() => {
    const selectedInstance = getValues(DbWizardFormFields.monitoringInstance);

    if (mode === 'new') {
      if (monitoring && availableMonitoringInstances?.length) {
        setValue(
          DbWizardFormFields.monitoringInstance,
          availableMonitoringInstances[0].name
        );
      }
    }
    if (
      (mode === 'edit' || mode === 'restoreFromBackup') &&
      availableMonitoringInstances?.length &&
      !selectedInstance
    ) {
      setValue(
        DbWizardFormFields.monitoringInstance,
        availableMonitoringInstances[0].name
      );
    }
  }, [monitoring]);

  return (
    <>
      <StepHeader
        pageTitle={Messages.monitoring}
        pageDescription={Messages.caption}
      />
      {!availableMonitoringInstances?.length && (
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
            disabled: !availableMonitoringInstances?.length,
          }}
        />
        {monitoring && availableMonitoringInstances?.length && (
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
