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

import { NetworkNode as NetworkNodeIcon, OverviewCard } from '@percona/ui-lib';
import OverviewSection from '../overview-section';
import { BackupsDetailsOverviewCardProps } from './card.types';
import OverviewSectionRow from '../overview-section-row';
import { Messages } from '../cluster-overview.messages';
import { Button, Stack } from '@mui/material';
import { Link, useMatch } from 'react-router-dom';
import { DBClusterDetailsTabs } from '../../db-cluster-details.types';
import OverviewSectionText from '../overview-section-text/overview-section-text';
import { getTimeSelectionPreviewMessage } from '../../../database-form/database-preview/database.preview.messages';
import { getFormValuesFromCronExpression } from '../../../../components/time-selection/time-selection.utils';

export const BackupsDetails = ({
  schedules,
  pitrEnabled,
  pitrStorageName,
  backup,
  loading,
}: BackupsDetailsOverviewCardProps) => {
  const routeMatch = useMatch('/databases/:namespace/:dbClusterName/:tabs');

  return (
    <OverviewCard
      dataTestId="backups-and-pitr"
      cardHeaderProps={{
        title: Messages.titles.backups,
        avatar: <NetworkNodeIcon />,
        action: (
          <Button
            component={Link}
            size="small"
            to={`/databases/${routeMatch?.params?.namespace}/${routeMatch?.params?.dbClusterName}/${DBClusterDetailsTabs.backups}`}
          >
            {Messages.actions.details}
          </Button>
        ),
      }}
    >
      <Stack gap={3}>
        {/*//TODO EVEREST-1066 backups statuses list*/}
        <OverviewSection
          dataTestId="schedules"
          title={Messages.titles.schedules}
          loading={loading}
        >
          {Array.isArray(schedules) &&
          schedules?.length > 0 &&
          backup?.enabled ? (
            schedules?.map((item) => (
              <OverviewSectionText key={`${item.name}-${item.schedule}`}>
                {getTimeSelectionPreviewMessage(
                  getFormValuesFromCronExpression(item.schedule)
                )}
              </OverviewSectionText>
            ))
          ) : (
            <OverviewSectionText>
              {Messages.fields.disabled}
            </OverviewSectionText>
          )}
        </OverviewSection>
        <OverviewSection
          dataTestId="pitr"
          title={Messages.titles.pitr}
          loading={loading}
        >
          {/*// TODO EVEREST-1066 the width of the columns on the layouts in different places is limited by a different number (but not by the content), a discussion with Design is required*/}
          <OverviewSectionRow
            labelProps={{ minWidth: '126px' }}
            label={Messages.fields.status}
            contentString={
              pitrEnabled ? Messages.fields.enabled : Messages.fields.disabled
            }
          />
          <OverviewSectionRow
            labelProps={{ minWidth: '126px' }}
            label={Messages.fields.backupStorages}
            contentString={pitrStorageName}
          />
        </OverviewSection>
      </Stack>
    </OverviewCard>
  );
};
