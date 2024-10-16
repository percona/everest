import { FormDialog } from 'components/form-dialog/form-dialog';
import { SubmitHandler } from 'react-hook-form';
import AdvancedConfigurationForm from 'components/cluster-form/advanced-configuration';
import { AdvancedConfigurationModalProps } from './edit-advanced-configuration.types';
import {
  AdvancedConfigurationFormType,
  advancedConfigurationsSchema,
} from 'components/cluster-form/advanced-configuration/advanced-configuration-schema';
import { Messages } from './edit-advanced-configuration.messages';
import { dbEngineToDbType } from '@percona/utils';
import { advancedConfigurationModalDefaultValues } from 'components/cluster-form/advanced-configuration/advanced-configuration.utils';

export const AdvancedConfigurationEditModal = ({
  open,
  handleCloseModal,
  handleSubmitModal,
  dbCluster,
}: AdvancedConfigurationModalProps) => {
  const onSubmit: SubmitHandler<AdvancedConfigurationFormType> = ({
    externalAccess,
    engineParametersEnabled,
    engineParameters,
    sourceRanges,
  }) => {
    handleSubmitModal({
      externalAccess,
      engineParametersEnabled,
      engineParameters,
      sourceRanges,
    });
  };

  return (
    <FormDialog
      size="XL"
      isOpen={open}
      closeModal={handleCloseModal}
      schema={advancedConfigurationsSchema}
      headerMessage={Messages.formDialogHeader}
      onSubmit={onSubmit}
      submitMessage={Messages.save}
      defaultValues={advancedConfigurationModalDefaultValues(dbCluster)}
    >
      <AdvancedConfigurationForm
        dbType={dbEngineToDbType(dbCluster?.spec?.engine?.type)}
      />
    </FormDialog>
  );
};
