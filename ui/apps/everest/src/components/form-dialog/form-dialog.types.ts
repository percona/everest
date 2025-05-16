import { DialogProps } from '@mui/material';
import { ReactNode } from 'react';

import {
  DefaultValues,
  FieldValues,
  UseFormReturn,
  ValidationMode,
} from 'react-hook-form';
import { z, ZodTypeDef } from 'zod';

export interface FormDialogProps<T extends FieldValues> {
  isOpen: boolean;
  closeModal: () => void;
  headerMessage: string;
  schema: z.Schema<unknown, ZodTypeDef>;
  defaultValues?: DefaultValues<T>;
  values?: T;
  onSubmit: (data: T) => void;
  children: ((formMethods: UseFormReturn<T>) => ReactNode) | ReactNode;
  cancelMessage?: string;
  submitMessage?: string;
  validationMode?: keyof ValidationMode;
  size?: 'L' | 'XL' | 'XXL' | 'XXXL';
  subHead2?: string;
  submitting?: boolean;
  disableSubmit?: boolean;
  dataTestId?: string;
  scroll?: DialogProps['scroll'];
}
