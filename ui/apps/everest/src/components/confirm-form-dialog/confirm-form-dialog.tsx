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
import {
  ConfirmDialogType,
  ConfirmFormDialogFields,
  confirmFormDialogSchema,
} from './confirm-form-dialog.types';
import { SubmitHandler } from 'react-hook-form';
import { TextInput } from '@percona/ui-lib';
import { kebabize } from '@percona/utils';
import { confirmDialogDefaultValues } from './confirm-dialog-consts';
import { IrreversibleAction } from './irreversible-action';
import { DialogContent } from '@mui/material';
import { ReactNode } from 'react';
import DeleteDataCheckbox from 'components/delete-data-checkbox/delete-data-checkbox';

interface ConfirmFormDialogProps<T extends ConfirmDialogType>
  extends Omit<
    FormDialogProps<T>,
    'schema' | 'onSubmit' | 'submitMessage' | 'cancelMessage' | 'children'
  > {
  inputLabel?: string;
  inputPlaceholder?: string;
  handleConfirm: (data: ConfirmDialogType) => void;
  selectedId: string;
  cancelMessage?: string;
  submitMessage?: string;
  dialogContent?: ReactNode;
}
export const ConfirmFormDialog = ({
  inputLabel,
  inputPlaceholder,
  handleConfirm,
  cancelMessage = 'Cancel',
  submitMessage = 'Delete',
  selectedId,
  dialogContent,
  submitting,
  ...props
}: ConfirmFormDialogProps<ConfirmDialogType>) => {
  const onSubmit: SubmitHandler<ConfirmDialogType> = (data) => {
    handleConfirm(data);
  };
  return (
    <FormDialog
      onSubmit={onSubmit}
      schema={confirmFormDialogSchema(selectedId)}
      defaultValues={confirmDialogDefaultValues}
      dataTestId={selectedId && kebabize(selectedId)}
      submitMessage={submitMessage}
      cancelMessage={cancelMessage}
      submitting={submitting}
      {...props}
    >
      <IrreversibleAction />
      <DialogContent sx={{ px: 1 }}>{dialogContent}</DialogContent>
      <TextInput
        name={ConfirmFormDialogFields.confirmInput}
        label={inputLabel}
        labelProps={{ sx: { mt: 0 } }}
        textFieldProps={{
          placeholder: inputPlaceholder,
        }}
      />
      <DeleteDataCheckbox formControlLabelProps={{ sx: { mt: 2, pl: 1 } }} />
    </FormDialog>
  );
};
