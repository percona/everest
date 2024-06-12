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

import { Grid } from '@mui/material';
import { Card } from '@percona/ui-lib';
import { beautifyDbTypeName } from '@percona/utils';
import { getTimeSelectionPreviewMessage } from '../../../database-form/database-preview/database.preview.messages';
import { Messages } from '../cluster-overview.messages';
import {
  OverviewSection,
  OverviewSectionText,
} from '../overview-section/overview-section';
import { DatabaseDetailsOverviewCardProps } from './card.types';
import { getFormValuesFromCronExpression } from 'components/time-selection/time-selection.utils';

export const DatabaseDetails = ({
  loading,
  type,
  name,
  namespace,
  version,
  numberOfNodes,
  cpu,
  memory,
  disk,
  backup,
  externalAccess,
  monitoring,
}: DatabaseDetailsOverviewCardProps) => {
  const schedules = backup?.schedules;

  return (
    <Card
      title={Messages.titles.dbDetails}
      dataTestId="database-details"
      content={
        <Grid container spacing={2}>
          <OverviewSection
            title={Messages.titles.basicInformation}
            loading={loading}
          >
            <OverviewSectionText>
              {Messages.fields.type(beautifyDbTypeName(type))}
            </OverviewSectionText>
            <OverviewSectionText>
              {Messages.fields.name(name)}
            </OverviewSectionText>
            <OverviewSectionText>
              {Messages.fields.namespace(namespace)}
            </OverviewSectionText>
            <OverviewSectionText>
              {Messages.fields.version(version)}
            </OverviewSectionText>
          </OverviewSection>
          <OverviewSection title={Messages.titles.resources} loading={loading}>
            <OverviewSectionText>
              {Messages.fields.numberOfNodes(numberOfNodes)}
            </OverviewSectionText>
            <OverviewSectionText>
              {Messages.fields.cpu(cpu)}
            </OverviewSectionText>
            <OverviewSectionText>
              {Messages.fields.memory(memory)}
            </OverviewSectionText>
            <OverviewSectionText>
              {Messages.fields.disk(disk)}
            </OverviewSectionText>
          </OverviewSection>
          <OverviewSection title={Messages.titles.backups} loading={loading}>
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
            title={Messages.titles.externalAccess}
            loading={loading}
          >
            <OverviewSectionText>
              {externalAccess
                ? Messages.fields.enabled
                : Messages.fields.disabled}
            </OverviewSectionText>
          </OverviewSection>
          <OverviewSection dataTestId="pitr" title={Messages.titles.pitr}>
            <OverviewSectionText dataTestId="pitr">
              {backup?.pitr?.enabled
                ? Messages.fields.enabled
                : Messages.fields.disabled}
            </OverviewSectionText>
          </OverviewSection>
          <OverviewSection title={Messages.titles.monitoring} loading={loading}>
            <OverviewSectionText>
              {monitoring ? Messages.fields.enabled : Messages.fields.disabled}
            </OverviewSectionText>
            {monitoring && (
              <OverviewSectionText>
                {Messages.fields.monitoring(monitoring)}
              </OverviewSectionText>
            )}
          </OverviewSection>
        </Grid>
      }
    />
  );
};
