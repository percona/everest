export type DatabaseFormBodyProps = {
  activeStep: number;
  longestAchievedStep: number;
  disableNext: boolean;
  disableSubmit: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  handleNextStep: () => void;
  handlePreviousStep: () => void;
};

export type DatabaseFormStepControllersProps = {
  disableBack: boolean;
  disableNext: boolean;
  disableSubmit: boolean;
  showSubmit: boolean;
  editMode: boolean;
  onPreviousClick: () => void;
  onNextClick: () => void;
  onCancel: () => void;
  onSubmit: () => void;
};
