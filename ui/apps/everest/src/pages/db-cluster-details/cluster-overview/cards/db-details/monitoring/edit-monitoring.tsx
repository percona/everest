import { FormDialog } from 'components/form-dialog/form-dialog';
import { Messages } from '../../../cluster-overview.messages';
import {
  EditMonitoringDialogType,
  monitoringEditDialogPropsSchema,
  MonitoringEditDialogProps,
  monitoringEditDialogDefaultValues,
  MonitoringEditDialogFields,
} from './edit-monitoring.types';
import { SubmitHandler } from 'react-hook-form';
import { AutoCompleteInput, SwitchInput } from '@percona/ui-lib';
import { useMonitoringInstancesList } from 'hooks/api/monitoring/useMonitoringInstancesList';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';

export const MonitoringEditModal = ({
  open,
  handleCloseModal,
  handleSubmitModal,
  monitoringName = '',
  enabled = false,
}: MonitoringEditDialogProps) => {
  const onSubmit: SubmitHandler<EditMonitoringDialogType> = ({
    monitoringNameInput,
    monitoringEnabledInput,
  }) => {
    handleSubmitModal(monitoringNameInput, monitoringEnabledInput);
  };

  const { namespace = '' } = useParams();
  const { data: monitoringInstances, isFetching: monitoringInstancesLoading } =
    useMonitoringInstancesList();

  const availableMonitoringInstances = useMemo(
    () =>
      (monitoringInstances || []).filter((item) =>
        item.allowedNamespaces.includes(namespace)
      ),
    [monitoringInstances, namespace]
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

  return (
    <FormDialog
      size="XL"
      isOpen={open}
      closeModal={handleCloseModal}
      schema={monitoringEditDialogPropsSchema()}
      headerMessage={Messages.titles.editMonitoring}
      onSubmit={onSubmit}
      submitMessage="Edit"
      defaultValues={monitoringEditDialogDefaultValues(
        monitoringName || monitoringInstancesOptions[0],
        enabled
      )}
    >
      <SwitchInput
        label={'enabled'}
        name={MonitoringEditDialogFields.monitoringEnabledInput}
        formControlLabelProps={{
          sx: {
            mt: 1,
          },
        }}
      />
      <AutoCompleteInput
        name={MonitoringEditDialogFields.monitoringNameInput}
        label={'monitoring'}
        loading={monitoringInstancesLoading}
        options={monitoringInstancesOptions}
        autoCompleteProps={{
          disableClearable: true,
          renderOption: (props, option) => (
            <li {...props}>{getInstanceOptionLabel(option)}</li>
          ),
        }}
      />
    </FormDialog>
  );
};
