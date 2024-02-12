import { Grid, Stack, Typography } from '@mui/material';
import { LoadableChildren } from '@percona/ui-lib';
import {
  OverviewSectionProps,
  OverviewSectionTextProps,
} from './overview-section.types';

export const OverviewSection = ({
  title,
  loading,
  children,
  dataTestId,
}: OverviewSectionProps) => (
  <Grid
    item
    xs={6}
    data-testid={
      dataTestId ? `${dataTestId}-overview-section` : 'overview-section'
    }
  >
    <Stack>
      <Typography color="text.primary" variant="sectionHeading">
        {title}
      </Typography>
      <LoadableChildren loading={loading}>{children}</LoadableChildren>
    </Stack>
  </Grid>
);

export const OverviewSectionText = ({
  children,
  dataTestId,
}: OverviewSectionTextProps) => (
  <Typography
    color="text.secondary"
    variant="caption"
    sx={{ wordBreak: 'break-word' }}
    data-testid={
      dataTestId
        ? `${dataTestId}-overview-section-text`
        : 'overview-section-text'
    }
  >
    {children}
  </Typography>
);
