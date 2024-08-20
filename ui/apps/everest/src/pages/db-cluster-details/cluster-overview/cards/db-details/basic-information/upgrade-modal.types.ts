import { z } from 'zod';
import { DbWizardFormFields } from '../../../../../database-form/database-form.types';
import { DbEngine } from '../../../../../../shared-types/dbEngines.types';

export interface UpgradeModalProps {
  open: boolean;
  handleCloseModal: () => void;
  handleSubmitModal: (dbVersion: string) => void;
  dbVersionsUpgradeList: DbEngine;
  version: string;
}

export const upgradeModalDefaultValues = (dbVersion: string) => ({
  [DbWizardFormFields.dbVersion]: dbVersion,
});

export const upgradeModalFormSchema = z.object({
  [DbWizardFormFields.dbVersion]: z.string().nonempty(),
});

export type UpgradeModalFormType = z.infer<typeof upgradeModalFormSchema>;
