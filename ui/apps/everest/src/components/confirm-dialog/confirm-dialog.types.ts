import { DialogProps } from '@mui/material';
import { ReactNode } from 'react';

export type ConfirmDialogProps = {
  selectedId: string;
  selectedNamespace?: string;
  closeModal: () => void;
  headerMessage: string;
  children: ReactNode;
  handleConfirm?: (selectedId: string) => void;
  handleConfirmNamespace?: (selectedId: string, namespace: string) => void;
  cancelMessage?: string;
  submitMessage?: string;
  disabledButtons?: boolean;
} & DialogProps;
