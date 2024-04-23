// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { FormDialog } from '../form-dialog';
import { FormDialogProps } from '../form-dialog/form-dialog.types';
import { SubmitHandler } from 'react-hook-form';
import { TextInput } from '@percona/ui-lib';
import { kebabize } from '@percona/utils';
import { customConfirmDialogDefaultValues } from './custom-confirm-dialog-consts';
import { IrreversibleAction } from '../irreversible-action';
import { DialogContent } from '@mui/material';
import { ReactNode } from 'react';
import { CustomCheckbox } from 'components/custom-confirm-dialog/custom-checkbox/custom-checkbox';
import {
  CustomConfirmDialogFields,
  CustomConfirmDialogType,
  customConfirmDialogSchema,
} from './custom-confirm-dialog.types';

interface CustomConfirmDialogProps<T extends CustomConfirmDialogType>
  extends Omit<
    FormDialogProps<T>,
    'schema' | 'onSubmit' | 'submitMessage' | 'cancelMessage' | 'children'
  > {
  inputLabel?: string;
  inputPlaceholder?: string;
  handleConfirm: (data: CustomConfirmDialogType) => void;
  selectedId: string;
  cancelMessage?: string;
  submitMessage: string;
  dialogContent?: ReactNode;
  confirmationInput?: boolean;
  alertTitle?: string;
  alertMessage: string;
  checkboxMessage: string;
}
export const CustomConfirmDialog = ({
  inputLabel,
  inputPlaceholder,
  handleConfirm,
  cancelMessage = 'Cancel',
  submitMessage,
  confirmationInput = true,
  selectedId,
  dialogContent,
  submitting,
  alertTitle = 'Irreversible action',
  alertMessage,
  checkboxMessage,
  ...props
}: CustomConfirmDialogProps<CustomConfirmDialogType>) => {
  const onSubmit: SubmitHandler<CustomConfirmDialogType> = (data) => {
    handleConfirm(data);
  };

  return (
    <FormDialog
      onSubmit={onSubmit}
      schema={customConfirmDialogSchema(selectedId, confirmationInput)}
      defaultValues={customConfirmDialogDefaultValues}
      dataTestId={selectedId && kebabize(selectedId)}
      submitMessage={submitMessage}
      cancelMessage={cancelMessage}
      submitting={submitting}
      {...props}
    >
      <IrreversibleAction alertTitle={alertTitle} alertMessage={alertMessage} />
      <DialogContent sx={{ px: 1 }}>{dialogContent}</DialogContent>
      {confirmationInput && (
        <TextInput
          name={CustomConfirmDialogFields.confirmInput}
          label={inputLabel}
          labelProps={{ sx: { mt: 0 } }}
          textFieldProps={{
            placeholder: inputPlaceholder,
          }}
        />
      )}
      <CustomCheckbox
        checkboxMessage={checkboxMessage}
        formControlLabelProps={{ sx: { mt: 2, pl: 1 } }}
      />
    </FormDialog>
  );
};
