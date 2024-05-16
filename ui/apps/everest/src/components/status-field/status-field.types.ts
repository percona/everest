export type BaseStatus =
  | 'error'
  | 'paused'
  | 'pending'
  | 'success'
  | 'deleting'
  | 'unknown';

export type StatusFieldProps<T extends string | number | symbol> = {
  status: T;
  children: React.ReactNode;
  statusMap: Record<T, BaseStatus>;
  dataTestId?: string;
};
