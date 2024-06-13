import { CustomConfirmDialogFields } from './custom-confirm-dialog.types';

export const customConfirmDialogDefaultValues = (disableCheckbox: boolean) => ({
  [CustomConfirmDialogFields.confirmInput]: '',
  [CustomConfirmDialogFields.dataCheckbox]: disableCheckbox ? true : false,
});
