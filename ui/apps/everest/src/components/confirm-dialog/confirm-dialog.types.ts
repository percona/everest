import { ReactNode } from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  selectedId: string;
  closeModal: () => void;
  headerMessage: string;
  children: ReactNode;
  handleConfirm: (selectedId: string) => void;
  cancelMessage?: string;
  submitMessage?: string;
  disabledButtons?: boolean;
}
