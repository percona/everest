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

import { Button, Stack, Typography } from '@mui/material';
import { LabeledContentProps } from './labeled-content.types';
import AddIcon from '@mui/icons-material/Add';

const LabeledContent = ({
  label,
  children,
  isRequired = false,
  sx,
  actionButtonProps,
  ...typographyProps
}: LabeledContentProps) => {
  const { dataTestId, buttonText, ...buttonProps } = actionButtonProps || {};
  return (
    <Stack
      sx={{
        '.MuiTextField-root': {
          mt: 1.5,
        },
        '.MuiAutocomplete-root': {
          mt: 1.5,
        },
        mt: 2,
        ...sx,
      }}
    >
      <Stack
        sx={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: actionButtonProps ? 1 : 0.5,
        }}
      >
        <Typography
          // @ts-ignore
          variant="sectionHeading"
          {...typographyProps}
        >
          {label}
          {isRequired && <span>*</span>}
        </Typography>
        {actionButtonProps && (
          <Button
            variant="text"
            size="small"
            startIcon={<AddIcon />}
            sx={{
              width: 'fit-content',
              alignSelf: 'end',
              ml: 'auto',
            }}
            data-testid={dataTestId || 'labeled-content-action-button'}
            {...buttonProps}
          >
            {buttonText || 'Add new'}
          </Button>
        )}
      </Stack>
      {children}
    </Stack>
  );
};

export default LabeledContent;
