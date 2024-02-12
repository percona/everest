import { createContext } from 'react';
import { ScheduleModalContextType } from './backups.types.ts';

export const ScheduleModalContext = createContext<ScheduleModalContextType>({});
