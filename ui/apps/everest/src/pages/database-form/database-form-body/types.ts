export type DatabaseFormBodyProps = {
  activeStep: number;
  longestAchievedStep: number;
  disableNext: boolean;
  isSubmitting: boolean;
  hasErrors: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  handleNextStep: () => void;
  handlePreviousStep: () => void;
};

export type DatabaseFormStepControllersProps = {
  disableBack: boolean;
  disableNext: boolean;
  disableSubmit: boolean;
  disableCancel: boolean;
  showSubmit: boolean;
  editMode: boolean;
  onPreviousClick: () => void;
  onNextClick: () => void;
  onCancel: () => void;
  onSubmit: () => void;
};
