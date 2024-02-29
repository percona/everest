import React from 'react';
import { Box } from '@mui/material';
import { useDatabasePageMode } from '../useDatabasePageMode';
import { useDatabasePageDefaultValues } from '../useDatabaseFormDefaultValues';
import { DatabaseFormBodyProps } from './types';
import { steps } from './steps';
import DatabaseFormStepControllers from './DatabaseFormStepControllers';

const DatabaseFormBody = ({
  activeStep,
  longestAchievedStep,
  disableNext,
  disableSubmit,
  onCancel,
  onSubmit,
  handleNextStep,
  handlePreviousStep,
}: DatabaseFormBodyProps) => {
  const mode = useDatabasePageMode();
  const { dbClusterRequestStatus, isFetching: loadingDefaultsForEdition } =
    useDatabasePageDefaultValues(mode);

  const isFirstStep = activeStep === 0;

  return (
    <form style={{ flexGrow: 1 }} onSubmit={onSubmit}>
      <Box>
        {(mode === 'new' ||
          ((mode === 'edit' || mode === 'restoreFromBackup') &&
            dbClusterRequestStatus === 'success')) &&
          React.createElement(steps[activeStep], {
            loadingDefaultsForEdition,
            alreadyVisited:
              longestAchievedStep > activeStep ||
              activeStep === steps.length - 1,
          })}
      </Box>
      <DatabaseFormStepControllers
        disableBack={isFirstStep}
        disableNext={disableNext}
        disableSubmit={disableSubmit}
        showSubmit={activeStep === steps.length - 1}
        editMode={mode === 'edit'}
        onPreviousClick={handlePreviousStep}
        onNextClick={handleNextStep}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </form>
  );
};

export default DatabaseFormBody;
