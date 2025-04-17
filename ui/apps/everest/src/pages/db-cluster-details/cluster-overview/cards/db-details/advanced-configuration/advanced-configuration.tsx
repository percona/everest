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

import { Messages } from '../../../cluster-overview.messages';
import OverviewSection from '../../../overview-section';
import { AdvancedConfigurationOverviewCardProps } from '../../card.types';
import OverviewSectionRow from '../../../overview-section-row';
import { DbClusterContext } from 'pages/db-cluster-details/dbCluster.context';
import { useContext, useState } from 'react';
import { AdvancedConfigurationEditModal } from './edit-advanced-configuration';
import { useUpdateDbClusterWithConflictRetry } from 'hooks';
import { AdvancedConfigurationFormType } from 'components/cluster-form/advanced-configuration/advanced-configuration-schema';
import {
  changeDbClusterAdvancedConfig,
  shouldDbActionsBeBlocked,
} from 'utils/db';

export const AdvancedConfiguration = ({
  loading,
  externalAccess,
  parameters,
  storageClass,
}: AdvancedConfigurationOverviewCardProps) => {
  const {
    canUpdateDb,
    dbCluster,
    queryResult: { refetch },
  } = useContext(DbClusterContext);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { mutate: updateCluster } = useUpdateDbClusterWithConflictRetry(
    dbCluster!,
    {
      onSuccess: async () => {
        await refetch();
        handleCloseModal();
        setUpdating(false);
      },
      onError: () => setUpdating(false),
    }
  );
  const handleCloseModal = () => {
    setOpenEditModal(false);
  };
  const editable =
    canUpdateDb && !shouldDbActionsBeBlocked(dbCluster?.status?.status);

  const handleSubmit = async ({
    externalAccess,
    sourceRanges,
    engineParametersEnabled,
    engineParameters,
  }: AdvancedConfigurationFormType) => {
    setUpdating(true);
    updateCluster(
      changeDbClusterAdvancedConfig(
        dbCluster!,
        engineParametersEnabled,
        externalAccess,
        engineParameters,
        sourceRanges
      )
    );
  };

  return (
    <OverviewSection
      title={Messages.titles.advancedConfiguration}
      loading={loading}
      dataTestId="advanced-configuration"
      editable={editable}
      {...(canUpdateDb
        ? {
            actionButtonProps: {
              onClick: () => {
                setOpenEditModal(true);
              },
              children: Messages.actions.edit,
              'data-testid': 'edit-advanced-configuration-db-btn',
            },
          }
        : undefined)}
    >
      <OverviewSectionRow
        label={Messages.fields.externalAccess}
        contentString={
          externalAccess ? Messages.fields.enabled : Messages.fields.disabled
        }
      />
      <OverviewSectionRow
        label={Messages.fields.parameters}
        contentString={
          parameters ? Messages.fields.enabled : Messages.fields.disabled
        }
      />
      <OverviewSectionRow
        label={Messages.fields.storageClass}
        contentString={storageClass}
      />
      {openEditModal && dbCluster && (
        <AdvancedConfigurationEditModal
          open={openEditModal}
          handleCloseModal={handleCloseModal}
          handleSubmitModal={handleSubmit}
          dbCluster={dbCluster}
          submitting={updating}
        />
      )}
    </OverviewSection>
  );
};
