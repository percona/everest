export type DatabaseFormSideDrawerProps = {
  activeStep: number;
  longestAchievedStep: number;
  disabled: boolean;
  stepsWithErrors: number[];
  handleSectionEdit: (section: number) => void;
};
