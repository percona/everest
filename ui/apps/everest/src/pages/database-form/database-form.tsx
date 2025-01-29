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

import { useEffect, useState } from 'react';
import { useLocation, useBlocker, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Step, StepLabel } from '@mui/material';
import { Stepper } from '@percona/ui-lib';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useCreateDbCluster } from 'hooks/api/db-cluster/useCreateDbCluster';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { steps } from './database-form-body/steps';
import { DbWizardType } from './database-form-schema';
import ConfirmationScreen from './database-form-body/steps/confirmation-screen';
import { useDatabasePageDefaultValues } from './useDatabaseFormDefaultValues';
import { useDatabasePageMode } from './useDatabasePageMode';
import { useDbValidationSchema } from './useDbValidationSchema';
import DatabaseFormCancelDialog from './database-form-cancel-dialog/index';
import DatabaseFormBody from './database-form-body';
import DatabaseFormSideDrawer from './database-form-side-drawer';

export const DatabasePage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [longestAchievedStep, setLongestAchievedStep] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [stepsWithErrors, setStepsWithErrors] = useState<number[]>([]);
  const { mutate: addDbCluster, isPending: isCreating } = useCreateDbCluster();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDesktop } = useActiveBreakpoint();
  const mode = useDatabasePageMode();
  const { defaultValues, isFetching: loadingClusterValues } =
    useDatabasePageDefaultValues(mode);

  const validationSchema = useDbValidationSchema(
    activeStep,
    defaultValues,
    mode
  );

  const methods = useForm<DbWizardType>({
    mode: 'onChange',
    resolver: async (data, context, options) => {
      const result = await zodResolver(validationSchema)(
        data,
        context,
        options
      );
      if (Object.keys(result.errors).length > 0) {
        console.log('RESOLVER', result.errors);
        setStepsWithErrors((prev) => {
          if (!prev.includes(activeStep)) {
            return [...prev, activeStep];
          }
          return prev;
        });
      } else {
        setStepsWithErrors((prev) =>
          prev.filter((step) => step !== activeStep)
        );
      }
      return result;
    },
    // @ts-ignore
    defaultValues,
  });

  const {
    reset,
    formState: { isDirty },
    clearErrors,
    handleSubmit,
    trigger,
  } = methods;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !formSubmitted &&
      currentLocation.pathname !== nextLocation.pathname
  );

  const onSubmit: SubmitHandler<DbWizardType> = (data) => {
    if (mode === 'new' || mode === 'restoreFromBackup') {
      addDbCluster(
        {
          dbPayload: data,
          ...(mode === 'restoreFromBackup' && {
            backupDataSource: {
              dbClusterBackupName: location.state?.backupName,
              ...(location.state?.pointInTimeDate && {
                pitr: {
                  date: location.state?.pointInTimeDate,
                  type: 'date',
                },
              }),
            },
          }),
        },
        {
          onSuccess: () => {
            setFormSubmitted(true);
          },
        }
      );
    }
  };

  const handleNext = async () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prevActiveStep) => {
        const newStep = prevActiveStep + 1;

        if (newStep > longestAchievedStep) {
          setLongestAchievedStep(newStep);
        }
        return newStep;
      });
    }
  };

  const handleBack = () => {
    clearErrors();
    if (activeStep > 0) {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    }
  };

  const handleSectionEdit = (order: number) => {
    clearErrors();
    setActiveStep(order - 1);
  };

  const handleCloseCancellationModal = () => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  const proceedNavigation = () => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  useEffect(() => {
    trigger();
  }, [activeStep, trigger]);

  console.log('stepsWithErrors', stepsWithErrors);

  useEffect(() => {
    // We disable the inputs on first step to make sure user doesn't change anything before all data is loaded
    // When users change the inputs, it means all data was loaded and we should't change the defaults anymore at this point
    // Because this effect relies on defaultValues, which comes from a hook that has dependencies that might be triggered somewhere else
    // E.g. If defaults depend on monitoringInstances query, step four will cause this to re-rerender, because that step calls that query again
    if (isDirty) {
      return;
    }

    if (mode === 'edit' || mode === 'restoreFromBackup') {
      reset(defaultValues);
    }
  }, [defaultValues, isDirty, reset, mode]);

  return formSubmitted ? (
    <ConfirmationScreen />
  ) : (
    <>
      <Stepper noConnector activeStep={activeStep} sx={{ marginBottom: 4 }}>
        {steps.map((_, idx) => (
          <Step key={`step-${idx + 1}`}>
            <StepLabel />
          </Step>
        ))}
      </Stepper>
      <Stack direction={isDesktop ? 'row' : 'column'}>
        <FormProvider {...methods}>
          <DatabaseFormBody
            activeStep={activeStep}
            longestAchievedStep={longestAchievedStep}
            isSubmitting={isCreating}
            hasErrors={stepsWithErrors.length > 0}
            onSubmit={handleSubmit(onSubmit)}
            onCancel={() => navigate('/databases')}
            handleNextStep={handleNext}
            handlePreviousStep={handleBack}
          />
          <DatabaseFormSideDrawer
            disabled={loadingClusterValues}
            activeStep={activeStep}
            longestAchievedStep={longestAchievedStep}
            handleSectionEdit={handleSectionEdit}
            stepsWithErrors={stepsWithErrors}
          />
        </FormProvider>
      </Stack>
      <DatabaseFormCancelDialog
        open={blocker.state === 'blocked'}
        onClose={handleCloseCancellationModal}
        onConfirm={proceedNavigation}
      />
    </>
  );
};
