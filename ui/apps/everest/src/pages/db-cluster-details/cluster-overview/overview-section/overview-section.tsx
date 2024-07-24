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

import { Grid, Stack, Typography, Divider, Box, Button } from '@mui/material';
import { LoadableChildren } from '@percona/ui-lib';
import { OverviewSectionProps } from './overview-section.types';
import { Messages } from './overview-section.messages';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

export const OverviewSection = ({
  title,
  loading,
  children,
  dataTestId,
  editable,
  actionButtonProps,
}: OverviewSectionProps) => (
  <Grid
    item
    xs={6}
    data-testid={
      dataTestId ? `${dataTestId}-overview-section` : 'overview-section'
    }
  >
    <Stack>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
      >
        <Typography color="text.primary" variant="sectionHeading">
          {title}
        </Typography>
        {actionButtonProps && (
          <Button
            size="small"
            startIcon={
              editable ? <EditOutlinedIcon /> : actionButtonProps?.startIcon
            }
            {...actionButtonProps}
          >
            {editable ? Messages.edit : actionButtonProps?.children}
          </Button>
        )}
      </Stack>
      <Divider sx={{ mt: 0.25 }} />
      <LoadableChildren loading={loading}>
        <Box sx={{ mt: 1 }}>{children}</Box>
      </LoadableChildren>
    </Stack>
  </Grid>
);

export default OverviewSection;
