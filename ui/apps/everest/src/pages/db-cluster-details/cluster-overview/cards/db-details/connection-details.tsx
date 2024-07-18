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

import { Messages } from '../../cluster-overview.messages';
import OverviewSection from '../../overview-section';
import { ConnectionDetailsOverviewCardProps1 } from '../card.types';
import OverviewSectionRow from '../../overview-section-row';
import { Box } from '@mui/material';
import { CopyToClipboardButton } from '@percona/ui-lib';
import { HiddenPasswordToggle } from 'components/hidden-row';

//TODO 1230 check size with typescript
export const ConnectionDetails = ({
  loading,
  hostname = '',
  username,
  password,
  port,
}: ConnectionDetailsOverviewCardProps1) => {
  return (
    <OverviewSection
      title={Messages.titles.connectionDetails}
      loading={loading}
    >
      <OverviewSectionRow
        label={Messages.fields.host}
        content={hostname.split(',').map((host) => (
          <Box key={host} sx={{ display: 'flex', gap: 1 }}>
            <div>{host}</div>
            <CopyToClipboardButton
              buttonProps={{
                color: 'primary',
                size: 'xs',
              }}
              inline={true}
              textToCopy={host}
            />
          </Box>
        ))}
      />
      <OverviewSectionRow
        label={Messages.fields.port}
        contentString={`${port}`}
      />
      <OverviewSectionRow
        label={Messages.fields.username}
        contentString={username}
      />
      <OverviewSectionRow
        label={Messages.fields.password}
        content={<HiddenPasswordToggle showCopy value={password} />}
      />
    </OverviewSection>
  );
};
