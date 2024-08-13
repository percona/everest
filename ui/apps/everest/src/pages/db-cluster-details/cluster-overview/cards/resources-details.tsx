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

import { useState } from 'react';
import { DatabaseIcon, OverviewCard } from '@percona/ui-lib';
import { Button } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import {
  CUSTOM_NODES_NR_INPUT_VALUE,
  matchFieldsValueToResourceSize,
  NODES_DB_TYPE_MAP,
  resourcesFormSchema,
} from 'components/cluster-form';
import OverviewSection from '../overview-section';
import { ResourcesDetailsOverviewProps } from './card.types';
import OverviewSectionRow from '../overview-section-row';
import { Messages } from '../cluster-overview.messages';
import { ResourcesEditModal } from './resources';
import { cpuParser, memoryParser } from 'utils/k8ResourceParser';
import { dbEngineToDbType } from '@percona/utils';
import { useUpdateDbClusterResources } from 'hooks';

export const ResourcesDetails = ({
  dbCluster,
  loading,
}: ResourcesDetailsOverviewProps) => {
  const [openEditModal, setOpenEditModal] = useState(false);
  const { mutate: updateDbClusterResources } = useUpdateDbClusterResources();
  const cpu = dbCluster.spec.engine.resources?.cpu || 0;
  const memory = dbCluster.spec.engine.resources?.memory || 0;
  const disk = dbCluster.spec.engine.storage.size;
  const dbType = dbEngineToDbType(dbCluster.spec.engine.type);
  const replicas = dbCluster.spec.engine.replicas.toString();
  const numberOfNodes = NODES_DB_TYPE_MAP[dbType].includes(replicas)
    ? replicas
    : CUSTOM_NODES_NR_INPUT_VALUE;

  const onSubmit: SubmitHandler<
    z.infer<ReturnType<typeof resourcesFormSchema>>
  > = ({ cpu, disk, memory, numberOfNodes, customNrOfNodes }) => {
    console.log(numberOfNodes);
    updateDbClusterResources(
      {
        dbCluster,
        newResources: {
          cpu,
          disk,
          memory,
          numberOfNodes: parseInt(
            numberOfNodes === CUSTOM_NODES_NR_INPUT_VALUE
              ? customNrOfNodes || '1'
              : numberOfNodes,
            10
          ),
        },
      },
      {
        onSuccess: () => {
          setOpenEditModal(false);
        },
      }
    );
  };

  return (
    <>
      <OverviewCard
        dataTestId="resources"
        cardHeaderProps={{
          title: Messages.titles.resources,
          avatar: <DatabaseIcon />,
          action: (
            <Button
              size="small"
              startIcon={<EditOutlinedIcon />}
              onClick={() => setOpenEditModal(true)}
            >
              Edit
            </Button>
          ),
        }}
      >
        <OverviewSection
          title={`${replicas} node${+replicas > 1 ? 's' : ''}`}
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
      </OverviewCard>
      {openEditModal && (
        <ResourcesEditModal
          dbType={dbType}
          handleCloseModal={() => setOpenEditModal(false)}
          onSubmit={onSubmit}
          defaultValues={{
            cpu: cpuParser(cpu.toString() || '0'),
            disk: memoryParser(disk.toString()),
            memory: memoryParser(memory.toString()),
            numberOfNodes,
            customNrOfNodes: replicas,
            resourceSizePerNode: matchFieldsValueToResourceSize(dbCluster),
          }}
        />
      )}
    </>
  );
};
