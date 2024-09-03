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

import { beautifyDbTypeName } from '@percona/utils';
import { Messages } from '../../cluster-overview.messages';
import OverviewSection from '../../overview-section';
import { BasicInformationOverviewCardProps } from '../card.types';
import OverviewSectionRow from '../../overview-section-row';

export const BasicInformationSection = ({
  loading,
  type,
  name,
  namespace,
  version,
}: BasicInformationOverviewCardProps) => {
  return (
    <OverviewSection
      dataTestId="basic-information"
      title={Messages.titles.basicInformation}
      loading={loading}
    >
      <OverviewSectionRow
        label="Type"
        contentString={beautifyDbTypeName(type)}
      />
      <OverviewSectionRow label="Name" contentString={name} />
      <OverviewSectionRow label="Namespace" contentString={namespace} />
      <OverviewSectionRow label="Version" contentString={version} />
    </OverviewSection>
  );
};
