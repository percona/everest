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

import OverviewSection from '../../overview-section';
import { ResourcesDetailsOverviewProps } from '../card.types';
import OverviewSectionRow from '../../overview-section-row';
import { Messages } from '../../cluster-overview.messages';
import { Button } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useContext, useState } from 'react';
import { ResourcesEditModal } from './resources-edit-modal/resources-edit';
import { useUpdateDbClusterResources } from '../../../../../hooks/api/db-cluster/useUpdateDbCluster';
import { DbClusterContext } from '../../../dbCluster.context';
import { DatabaseIcon, OverviewCard } from '@percona/ui-lib';

export const ResourcesDetails = ({
  numberOfNodes,
  cpu,
  memory,
  disk,
  loading,
}: ResourcesDetailsOverviewProps) => {
  const [openEditModal, setOpenEditModal] = useState(false);
  const handleCloseModal = () => {
    setOpenEditModal(false);
  };
  const { dbCluster } = useContext(DbClusterContext);
  const { mutate: updateDbClusterResources } = useUpdateDbClusterResources();

  const handleSubmit = (
    cpu: number,
    memory: number,
    disk: number,
    numberOfNodes: number
  ) => {
    updateDbClusterResources({
      clusterName: dbCluster!.metadata?.name,
      namespace: dbCluster!.metadata?.namespace,
      dbCluster: dbCluster!,
      cpu,
      memory,
      disk,
      numberOfNodes,
    });
    handleCloseModal();
  };

  return (
    <OverviewCard
      dataTestId="resources"
      cardHeaderProps={{
        title: Messages.titles.resources,
        avatar: <DatabaseIcon />,
        action: (
          <Button
            onClick={() => {
              setOpenEditModal(true);
            }}
            size="small"
            startIcon={<EditOutlinedIcon />}
          >
            Edit
          </Button>
        ),
      }}
    >
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
      {openEditModal && dbCluster && (
        <ResourcesEditModal
          open={openEditModal}
          handleCloseModal={handleCloseModal}
          handleSubmitModal={handleSubmit}
          dbCluster={dbCluster}
        />
      )}
    </OverviewCard>
  );
};
