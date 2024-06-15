import React from 'react';
import { Stack, Typography } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { DatabasePreviewProps } from './database-preview.types';
import { previewSections } from './sections/constants';
import { Messages } from './database.preview.messages';
import { PreviewSection } from './preview-section';
import { DbWizardType } from '../database-form-schema.ts';
import { useDatabasePageMode } from '../useDatabasePageMode.ts';

export const DatabasePreview = ({
  activeStep,
  longestAchievedStep,
  onSectionEdit = () => {},
  disabled,
  sx,
  ...stackProps
}: DatabasePreviewProps) => {
  const {
    getValues,
    formState: { errors },
  } = useFormContext<DbWizardType>();
  const mode = useDatabasePageMode();

  // Under normal circumstances, useWatch should return the right values
  // But the initial setValue are not taking effect
  // So we just call useWatch to cause a re-render, and get the values from getValues
  useWatch();

  const values = getValues();

  return (
    <Stack sx={{ pr: 2, pl: 2, ...sx }} {...stackProps}>
      <Typography variant="overline">{Messages.title}</Typography>
      <Stack>
        {previewSections.map((Section, idx) => (
          <React.Fragment key={`section-${idx + 1}`}>
            <PreviewSection
              order={idx + 1}
              title={Messages.preview[idx]}
              hasBeenReached={longestAchievedStep >= idx || mode === 'edit'}
              active={activeStep === idx}
              disabled={disabled || Object.values(errors).length != 0}
              onEditClick={() => onSectionEdit(idx + 1)}
              sx={{
                mt: idx === 0 ? 2 : 0,
              }}
            >
              <Section {...values} />
            </PreviewSection>
          </React.Fragment>
        ))}
      </Stack>
    </Stack>
  );
};
