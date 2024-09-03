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

import { DatabaseIcon, OverviewCard } from '@percona/ui-lib';
import OverviewSection from '../overview-section';
import { ResourcesDetailsOverviewProps } from './card.types';
import OverviewSectionRow from '../overview-section-row';
import { Messages } from '../cluster-overview.messages';
import { Stack } from '@mui/material';
import { DbType } from '@percona/types';

export const ResourcesDetails = ({
  numberOfNodes,
  cpu,
  memory,
  disk,
  loading,
  dbType,
  sharding,
}: ResourcesDetailsOverviewProps) => {
  return (
    <OverviewCard
      dataTestId="resources"
      cardHeaderProps={{
        title: Messages.titles.resources,
        avatar: <DatabaseIcon />,
        // TODO implement with EVEREST-1211
        // action: (
        //     <Button size="small" startIcon={<EditOutlinedIcon />}>
        //     Edit
        //   </Button>
        // ),
      }}
    >
      <Stack gap={3}>
        {dbType === DbType.Mongo && (
          <OverviewSection title={'Sharding'} loading={loading}>
            <OverviewSectionRow
              label={Messages.fields.status}
              contentString={
                sharding?.enabled
                  ? Messages.fields.enabled
                  : Messages.fields.disabled
              }
            />
            {sharding?.enabled && (
              <OverviewSectionRow
                label={Messages.fields.shards}
                contentString={sharding?.shards?.toString()}
              />
            )}
            {sharding?.enabled && (
              <OverviewSectionRow
                label={Messages.fields.configServers}
                contentString={sharding?.configServer?.replicas?.toString()}
              />
            )}
          </OverviewSection>
        )}
        <OverviewSection
          title={`${numberOfNodes} node${+numberOfNodes > 1 ? 's' : ''}`}
          loading={loading}
        >
          <OverviewSectionRow
            label={Messages.fields.cpu}
            contentString={`${cpu}`}
          />
          <OverviewSectionRow
            label={Messages.fields.disk}
            contentString={`${disk}`}
          />
          <OverviewSectionRow
            label={Messages.fields.memory}
            contentString={`${memory}`}
          />
        </OverviewSection>
      </Stack>
    </OverviewCard>
  );
};
