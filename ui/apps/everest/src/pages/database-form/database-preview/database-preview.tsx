import React from 'react';
import { Stack, Typography } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { DatabasePreviewProps } from './database-preview.types';
import { usePreviewSections } from './sections/utils.ts';
import { Messages } from './database.preview.messages';
import { PreviewSection } from './preview-section';
import { DbWizardType } from '../database-form-schema.ts';

export const DatabasePreview = ({
  activeStep,
  longestAchievedStep,
  onSectionEdit = () => {},
  disabled,
  stepsWithErrors,
  sx,
  ...stackProps
}: DatabasePreviewProps) => {
  const { getValues } = useFormContext<DbWizardType>();
  const previewSections = usePreviewSections();

  // Under normal circumstances, useWatch should return the right values
  // But the initial setValue are not taking effect
  // So we just call useWatch to cause a re-render, and get the values from getValues
  useWatch();

  const values = getValues();

  return (
    <Stack sx={{ pr: 2, pl: 2, ...sx }} {...stackProps}>
      <Typography variant="overline">{Messages.title}</Typography>
      <Stack>
        {previewSections.map((section, idx) => {
          const Section = section.component;
          const title = section.title;
          return (
            <React.Fragment key={`section-${idx + 1}`}>
              <PreviewSection
                order={idx + 1}
                title={title}
                hasBeenReached={longestAchievedStep >= idx}
                hasError={stepsWithErrors.includes(idx) && activeStep !== idx}
                active={activeStep === idx}
                disabled={disabled}
                onEditClick={() => onSectionEdit(idx + 1)}
                sx={{
                  mt: idx === 0 ? 2 : 0,
                }}
              >
                <Section {...values} />
              </PreviewSection>
            </React.Fragment>
          );
        })}
      </Stack>
    </Stack>
  );
};
