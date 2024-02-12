export type ScheduleModalContextType = {
  mode?: 'new' | 'edit';
  setMode?: React.Dispatch<React.SetStateAction<'new' | 'edit'>>;
  selectedScheduleName?: string;
  setSelectedScheduleName?: React.Dispatch<React.SetStateAction<string>>;
  openScheduleModal?: boolean;
  setOpenScheduleModal?: React.Dispatch<React.SetStateAction<boolean>>;
};
