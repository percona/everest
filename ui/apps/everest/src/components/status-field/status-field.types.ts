export type BaseStatus = 'error' | 'paused' | 'pending' | 'success' | 'unknown';

export type StatusFieldProps<T extends string | number | symbol> = {
  status: T;
  children: React.ReactNode;
  statusMap: Record<T, BaseStatus>;
  dataTestId?: string;
};
