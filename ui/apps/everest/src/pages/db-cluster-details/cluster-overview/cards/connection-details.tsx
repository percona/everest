import { Box, Grid } from '@mui/material';
import { Card, CopyToClipboardButton } from '@percona/ui-lib';
import { HiddenPasswordToggle } from 'components/hidden-row';
import { Messages } from '../cluster-overview.messages';
import {
  OverviewSection,
  OverviewSectionText,
} from '../overview-section/overview-section';
import { ConnectionDetailsOverviewCardProps } from './card.types';

export const ConnectionDetails = ({
  loading,
  loadingClusterDetails,
  hostname,
  port,
  username,
  password,
}: ConnectionDetailsOverviewCardProps) => (
  <Card
    title={Messages.titles.connectionDetails}
    dataTestId="connection-details"
    content={
      <Grid container spacing={2}>
        <OverviewSection title={Messages.titles.host} loading={loading}>
          <OverviewSectionText>
            {hostname?.split(',').map((host) => (
              <Box key={host} sx={{ display: 'flex', gap: 1 }}>
                <div>{host}</div>
                <CopyToClipboardButton
                  buttonProps={{ sx: { mt: -1, mb: -1.5 } }}
                  textToCopy={host}
                />
              </Box>
            ))}
          </OverviewSectionText>
        </OverviewSection>
        <OverviewSection title={Messages.titles.port} loading={loading}>
          <OverviewSectionText>{port}</OverviewSectionText>
        </OverviewSection>
        <OverviewSection
          title={Messages.titles.username}
          loading={loadingClusterDetails}
        >
          <OverviewSectionText>{username}</OverviewSectionText>
        </OverviewSection>
        <OverviewSection
          title={Messages.titles.password}
          loading={loadingClusterDetails}
        >
          <OverviewSectionText>
            <HiddenPasswordToggle showCopy value={password} />
          </OverviewSectionText>
        </OverviewSection>
      </Grid>
    }
  />
);
