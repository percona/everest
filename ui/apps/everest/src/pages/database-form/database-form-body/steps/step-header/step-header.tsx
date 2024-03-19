import { Typography } from '@mui/material';

type StepHeaderProps = {
  pageTitle?: string;
  pageDescription?: string;
};
export const StepHeader = ({ pageTitle, pageDescription }: StepHeaderProps) => {
  const array: string[] = [];
  console.log(array[0].substring(0, 1));
  return (
    <>
      {pageTitle && (
        <Typography variant="h5" data-testid="step-header">
          {pageTitle}
        </Typography>
      )}
      {pageDescription && (
        <Typography
          data-testid="step-description"
          variant="subtitle2"
          sx={{ mt: 1 }}
        >
          {pageDescription}
        </Typography>
      )}
    </>
  );
};
