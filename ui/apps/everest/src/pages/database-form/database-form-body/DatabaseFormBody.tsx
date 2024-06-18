// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
  isSubmitting,
  hasErrors,
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
        disableBack={isFirstStep || hasErrors}
        disableNext={disableNext}
        disableSubmit={isSubmitting || hasErrors}
        disableCancel={isSubmitting}
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
