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

import { DatabaseIcon } from '@percona/ui-lib';
import { OverviewSection } from '../overview-section/overview-section';
import { ResourcesDetailsOverviewProps } from './card.types';
import { OverviewCard } from '../overview-card/overview-card';
import { Box, Typography } from '@mui/material';

export const ResourcesDetails = ({
  numberOfNodes,
  cpu,
  // memory,
  // disk,
  loading,
}: ResourcesDetailsOverviewProps) => {
  return (
    <OverviewCard
      dataTestId="resources-details"
      cardHeaderProps={{
        title: 'Resources',
        avatar: <DatabaseIcon />,
      }}
      content={
        <OverviewSection
          title={`${numberOfNodes} node${+numberOfNodes > 1 ? 's' : ''}`}
          loading={loading}
        >
          <Box>
            <Typography variant="overline">CPU</Typography>
            <Typography variant="caption">{cpu}</Typography>
          </Box>
          {/*waiting the typography from Nuna*/}
        </OverviewSection>
      }
    />
  );
};
