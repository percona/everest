export enum WizardMode {
  New = "new",
  Edit = "edit",
  Restore = "restore",
}

export type ScheduleWizardMode = Exclude<WizardMode, WizardMode.Restore>;
