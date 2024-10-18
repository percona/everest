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
import { useUpdateDbClusterAdvancedConfiguration } from 'hooks';
import { AdvancedConfigurationFormType } from 'components/cluster-form/advanced-configuration/advanced-configuration-schema';

export const AdvancedConfiguration = ({
  loading,
  externalAccess,
  // parameters,
}: AdvancedConfigurationOverviewCardProps) => {
  const { canUpdateDb, dbCluster } = useContext(DbClusterContext);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { mutate: updateDbClusterAdvancedConfiguration } =
    useUpdateDbClusterAdvancedConfiguration();
  const handleCloseModal = () => {
    setOpenEditModal(false);
  };

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
        onSuccess: () => {
          handleCloseModal();
          setUpdating(false);
        },
      }
    );
  };

  // ?
  // useEffect(() => {
  //   if (updating && dbCluster?.status?.status !== DbClusterStatus.ready) {
  //     handleCloseModal();
  //     setUpdating(false);
  //   }
  // }, [updating, dbCluster?.status?.status]);

  return (
    <OverviewSection
      title={Messages.titles.advancedConfiguration}
      loading={loading}
      dataTestId="advanced-configuration"
      editable={canUpdateDb}
      {...(canUpdateDb
        ? {
            actionButtonProps: {
              onClick: () => {
                setOpenEditModal(true);
              },
              children: Messages.actions.edit,
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
      {/*<OverviewSectionRow*/}
      {/*  label={Messages.fields.parameters}*/}
      {/*  contentString={*/}
      {/*    parameters ? Messages.fields.enabled : Messages.fields.disabled*/}
      {/*  }*/}
      {/*/>*/}
      {/*//TODO 1210 waits https://perconacorp.slack.com/archives/C0545J2BEJX/p1721309559055999*/}

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
