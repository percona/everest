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

import { Stack } from '@mui/material';
import { DatabaseIcon, OverviewCard } from '@percona/ui-lib';
import { Messages } from '../../cluster-overview.messages';
import { DatabaseDetailsOverviewCardProps } from '../card.types';
import { BasicInformationSection } from './basic';
import { ConnectionDetails } from './connection-details';

// TODO 1230 add OtherColumns
export const DbDetails = ({
  loading,
  type,
  name,
  namespace,
  version,
  loadingClusterDetails,
  port,
  username,
  password,
  hostname,
}: DatabaseDetailsOverviewCardProps) => {
  return (
    <OverviewCard
      dataTestId="database-details"
      cardHeaderProps={{
        title: Messages.titles.dbDetails,
        avatar: <DatabaseIcon />,
      }}
    >
      <Stack gap={3}>
        <BasicInformationSection
          loading={loading}
          type={type}
          name={name}
          namespace={namespace}
          version={version}
        />
        <ConnectionDetails
          loading={loading}
          loadingClusterDetails={loadingClusterDetails}
          port={port}
          username={username}
          hostname={hostname}
          password={password}
        />
        {/*<OverviewSection title={Messages.titles.monitoring} loading={loading}>*/}
        {/*  <OverviewSectionRow*/}
        {/*    label={Messages.fields.status}*/}
        {/*    contentString={*/}
        {/*      monitoring ? Messages.fields.enabled : Messages.fields.disabled*/}
        {/*    }*/}
        {/*  />*/}
        {/*  <OverviewSectionRow*/}
        {/*    label={Messages.fields.name}*/}
        {/*    contentString={monitoring}*/}
        {/*  />*/}
        {/*</OverviewSection>*/}
        {/*<OverviewSection*/}
        {/*  title={Messages.titles.advancedConfiguration}*/}
        {/*  loading={loading}*/}
        {/*>*/}
        {/*  <OverviewSectionRow*/}
        {/*    label={Messages.fields.externalAccess}*/}
        {/*    contentString={*/}
        {/*      externalAccess*/}
        {/*        ? Messages.fields.enabled*/}
        {/*        : Messages.fields.disabled*/}
        {/*    }*/}
        {/*  />*/}
        {/*  <OverviewSectionRow*/}
        {/*    label={Messages.fields.parameters}*/}
        {/*    contentString="TODO"*/}
        {/*  />*/}
        {/*</OverviewSection>*/}
      </Stack>
    </OverviewCard>
  );
};
