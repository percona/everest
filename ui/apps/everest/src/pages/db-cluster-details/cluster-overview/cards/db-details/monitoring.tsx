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
import { MonitoringConfigurationOverviewCardProps } from '../card.types';
import OverviewSectionRow from '../../overview-section-row';

export const MonitoringDetails = ({
  loading,
  monitoring,
}: MonitoringConfigurationOverviewCardProps) => {
  return (
    <OverviewSection
      dataTestId="monitoring"
      title={Messages.titles.monitoring}
      loading={loading}
      // actionButtonProps={{
      //   onClick: () => {console.log('edit action')}
      // }}
      // editable={true}
    >
      <OverviewSectionRow
        label={Messages.fields.status}
        contentString={
          monitoring ? Messages.fields.enabled : Messages.fields.disabled
        }
      />
      {monitoring && (
        <OverviewSectionRow
          label={Messages.fields.username}
          contentString={monitoring}
        />
      )}
    </OverviewSection>
  );
};
