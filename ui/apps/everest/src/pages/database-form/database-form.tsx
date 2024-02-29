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

import { zodResolver } from '@hookform/resolvers/zod';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Drawer,
  Stack,
  Step,
  StepLabel,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { DialogTitle, Stepper } from '@percona/ui-lib';
import React, { useEffect, useMemo, useState } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { Messages } from './database-form.messages';
import { DbWizardFormFields } from './database-form.types';
import { steps } from './steps';

import { useCreateDbCluster } from 'hooks/api/db-cluster/useCreateDbCluster';
import { useUpdateDbCluster } from 'hooks/api/db-cluster/useUpdateDbCluster';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { DbWizardType } from './database-form-schema.ts';
import { DatabasePreview } from './database-preview/database-preview';
import { SixthStep } from './steps/sixth/sixth-step';
import { useDatabasePageDefaultValues } from './useDatabaseFormDefaultValues';
import { useDatabasePageMode } from './useDatabasePageMode';
import { useDbValidationSchema } from './useDbValidationSchema.ts';

export const DatabasePage = () => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [longestAchievedStep, setLongestAchievedStep] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [closeModalIsOpen, setModalIsOpen] = useState(false);

  const { mutate: addDbCluster, isPending: isCreating } = useCreateDbCluster();
  const { mutate: editDbCluster, isPending: isUpdating } = useUpdateDbCluster();
  const { isDesktop } = useActiveBreakpoint();
  const navigate = useNavigate();
  const { state } = useLocation();

  const mode = useDatabasePageMode();
  const {
    defaultValues,
    dbClusterData,
    dbClusterRequestStatus,
    isFetching: loadingDefaultsForEdition,
  } = useDatabasePageDefaultValues(mode);

  const validationSchema = useDbValidationSchema(
    activeStep,
    mode,
    dbClusterData
  );

  const methods = useForm<DbWizardType>({
    mode: 'onChange',
    resolver: zodResolver(validationSchema),
    // @ts-ignore
    defaultValues,
  });

  const {
    reset,
    trigger,
    handleSubmit,
    formState: { errors, isDirty },
    clearErrors,
  } = methods;

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

  const firstStep = activeStep === 0;

  const onSubmit: SubmitHandler<DbWizardType> = (data) => {
    if (mode === 'new' || mode === 'restoreFromBackup') {
      addDbCluster(
        {
          dbPayload: data,
          ...(mode === 'restoreFromBackup' && {
            backupDataSource: {
              dbClusterBackupName: state?.backupName,
              pitr: {
                date: state?.pointInTimeDate,
                type: 'date',
              },
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
    if (mode === 'edit' && dbClusterData) {
      editDbCluster(
        { dbPayload: data, dbCluster: dbClusterData },
        {
          onSuccess: () => {
            setFormSubmitted(true);
          },
        }
      );
    }
  };

  const handleNext: React.MouseEventHandler<HTMLButtonElement> = async () => {
    if (activeStep < steps.length - 1) {
      let isStepValid;

      if (errors[DbWizardFormFields.disk] && activeStep === 1) {
        isStepValid = false;
      } else {
        isStepValid = await trigger();
      }

      if (isStepValid) {
        setActiveStep((prevActiveStep) => {
          const newStep = prevActiveStep + 1;

          if (newStep > longestAchievedStep) {
            setLongestAchievedStep(newStep);
          }
          return newStep;
        });
      }
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

  const handleCancel = () => {
    navigate('/databases');
  };

  const PreviewContent = useMemo(
    () => (
      <DatabasePreview
        activeStep={activeStep}
        longestAchievedStep={longestAchievedStep}
        onSectionEdit={handleSectionEdit}
        sx={{
          mt: 2,
          ...(!isDesktop && {
            padding: 0,
          }),
        }}
      />
    ),
    [activeStep, longestAchievedStep, isDesktop]
  );

  return formSubmitted ? (
    <SixthStep />
  ) : (
    <>
      <Dialog open={closeModalIsOpen}>
        <DialogTitle onClose={() => setModalIsOpen(false)}>
          {Messages.dialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography>{Messages.dialog.content}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            variant="text"
            onClick={() => setModalIsOpen(false)}
          >
            {Messages.dialog.reject}
          </Button>
          <Button variant="contained" onClick={handleCancel}>
            {Messages.dialog.accept}
          </Button>
        </DialogActions>
      </Dialog>
      <Stepper noConnector activeStep={activeStep} sx={{ marginBottom: 4 }}>
        {steps.map((_, idx) => (
          <Step key={`step-${idx + 1}`}>
            <StepLabel />
          </Step>
        ))}
      </Stepper>
      <FormProvider {...methods}>
        <Stack direction={isDesktop ? 'row' : 'column'}>
          <form style={{ flexGrow: 1 }} onSubmit={handleSubmit(onSubmit)}>
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
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4 }}>
              <Button
                type="button"
                startIcon={<ArrowBackIcon />}
                variant="text"
                disabled={firstStep}
                onClick={handleBack}
                sx={{ mr: 1 }}
                data-testid="db-wizard-previous-button"
              >
                {Messages.previous}
              </Button>
              <Box sx={{ flex: '1 1 auto' }} />
              <Button
                variant="outlined"
                disabled={isCreating || isUpdating}
                data-testid="db-wizard-cancel-button"
                sx={{ mr: 1 }}
                onClick={() => setModalIsOpen(true)}
              >
                {Messages.cancel}
              </Button>
              {activeStep === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit(onSubmit)}
                  variant="contained"
                  disabled={isCreating || isUpdating}
                  data-testid="db-wizard-submit-button"
                >
                  {mode === 'edit'
                    ? Messages.editDatabase
                    : Messages.createDatabase}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  data-testid="db-wizard-continue-button"
                  disabled={Object.values(errors).length > 0}
                >
                  {Messages.continue}
                </Button>
              )}
            </Box>
          </form>
          {isDesktop ? (
            <Drawer
              variant="permanent"
              anchor="right"
              sx={{
                // MuiDrawer-paper will take 25% of the whole screen because it has a "fixed" positioning
                // Hence, we must use vw here to have the same calculation
                // We subtract the padding
                width: (theme) => `calc(25vw - ${theme.spacing(4)})`,
                flexShrink: 0,
                ml: 3,
                [`& .MuiDrawer-paper`]: {
                  width: '25%',
                  boxSizing: 'border-box',
                },
              }}
            >
              <Toolbar />
              {PreviewContent}
            </Drawer>
          ) : (
            <>
              <Divider
                orientation="horizontal"
                flexItem
                sx={{
                  // This is a little tweak
                  // We make the divider longer, adding the main padding value
                  // Then, to make it begin before the main padding, we add a negative margin
                  // This way, the divider will cross the whole section
                  width: `calc(100% + ${theme.spacing(4 * 2)})`,
                  ml: -4,
                  mt: 6,
                }}
              />
              {PreviewContent}
            </>
          )}
        </Stack>
      </FormProvider>
    </>
  );
};
