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

import { ArrowOutward } from '@mui/icons-material';
import { Messages } from '../../../cluster-overview.messages';
import OverviewSection from '../../../overview-section';
import { AdvancedConfigurationOverviewCardProps } from '../../card.types';
import OverviewSectionRow from '../../../overview-section-row';
import { DbClusterContext } from 'pages/db-cluster-details/dbCluster.context';
import { useContext, useMemo, useState } from 'react';
import { AdvancedConfigurationEditModal } from './edit-advanced-configuration';
import { useUpdateDbClusterAdvancedConfiguration } from 'hooks';
import { AdvancedConfigurationFormType } from 'components/cluster-form/advanced-configuration/advanced-configuration-schema';
import { DbClusterStatus } from 'shared-types/dbCluster.types';
import { IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { dbEngineToDbType } from '@percona/utils';
import { areAffinityRulesDefault } from 'utils/db';

export const AdvancedConfiguration = ({
  loading,
  externalAccess,
  parameters,
  affinityRules,
}: AdvancedConfigurationOverviewCardProps) => {
  const {
    canUpdateDb,
    dbCluster,
    queryResult: { refetch },
  } = useContext(DbClusterContext);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { mutate: updateDbClusterAdvancedConfiguration } =
    useUpdateDbClusterAdvancedConfiguration();
  const navigate = useNavigate();
  const handleCloseModal = () => {
    setOpenEditModal(false);
  };
  const usingDefaultAffinityRules = useMemo(
    () =>
      areAffinityRulesDefault(
        affinityRules,
        dbEngineToDbType(dbCluster!.spec.engine.type),
        dbCluster?.spec.sharding?.enabled
      ),
    [affinityRules, dbCluster]
  );
  const restoringOrDeleting = [
    DbClusterStatus.restoring,
    DbClusterStatus.deleting,
  ].includes(dbCluster?.status?.status!);
  const editable = canUpdateDb && !restoringOrDeleting;

  const handleSubmit = async ({
    externalAccess,
    sourceRanges,
    engineParametersEnabled,
    engineParameters,
  }: AdvancedConfigurationFormType) => {
    setUpdating(true);
    updateDbClusterAdvancedConfiguration(
      {
        clusterName: dbCluster!.metadata?.name,
        namespace: dbCluster!.metadata?.namespace,
        dbCluster: dbCluster!,
        externalAccess: externalAccess,
        sourceRanges: sourceRanges,
        engineParametersEnabled: engineParametersEnabled,
        engineParameters: engineParameters,
      },
      {
        onSuccess: async () => {
          await refetch();
          handleCloseModal();
          setUpdating(false);
        },
        onError: () => {
          setUpdating(false);
        },
      }
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
        label={Messages.fields.affinity}
        contentString={
          <>
            {usingDefaultAffinityRules
              ? Messages.titles.default
              : Messages.titles.custom}
            <IconButton
              size="small"
              color="primary"
              onClick={() =>
                navigate(
                  `/databases/${dbCluster?.metadata.namespace}/${dbCluster?.metadata.name}/components`
                )
              }
              sx={{
                position: 'absolute',
                bottom: '-4px',
              }}
            >
              <ArrowOutward />
            </IconButton>
          </>
        }
      />
      <OverviewSectionRow
        label={Messages.fields.parameters}
        contentString={
          parameters ? Messages.fields.enabled : Messages.fields.disabled
        }
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
