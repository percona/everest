import { FormDialog } from 'components/form-dialog/form-dialog';
import {
  upgradeModalDefaultValues,
  upgradeModalFormSchema,
  UpgradeModalFormType,
  UpgradeModalProps,
} from './upgrade-modal.types';
import { DbWizardFormFields } from '../../../../../database-form/database-form.types';
import { MenuItem } from '@mui/material';
import { SelectInput } from '@percona/ui-lib';
import { Messages } from './upgrade-modal.messages';
import { SubmitHandler } from 'react-hook-form';

export const UpgradeModal = ({
  open,
  handleCloseModal,
  handleSubmitModal,
  version,
  dbVersionsUpgradeList,
}: UpgradeModalProps) => {
  const onSubmit: SubmitHandler<UpgradeModalFormType> = ({ dbVersion }) => {
    handleSubmitModal(dbVersion);
  };

  return (
    <FormDialog
      size="XL"
      isOpen={open}
      closeModal={handleCloseModal}
      schema={upgradeModalFormSchema}
      headerMessage={Messages.title}
      onSubmit={onSubmit}
      submitMessage={Messages.upgrade}
      defaultValues={upgradeModalDefaultValues(version)}
    >
      <SelectInput
        name={DbWizardFormFields.dbVersion}
        label={Messages.dbVersion}
      >
        {dbVersionsUpgradeList?.availableVersions?.engine?.map((version) => (
          <MenuItem value={version.version} key={version.version}>
            {version.version}
          </MenuItem>
        ))}
      </SelectInput>
    </FormDialog>
  );
};
