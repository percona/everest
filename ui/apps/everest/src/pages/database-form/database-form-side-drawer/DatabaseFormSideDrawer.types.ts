export type DatabaseFormSideDrawerProps = {
  activeStep: number;
  longestAchievedStep: number;
  disabled: boolean;
  handleSectionEdit: (section: number) => void;
};
