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
import { Messages } from '../../../cluster-overview.messages';
import OverviewSection from '../../../overview-section';
import { BasicInformationOverviewCardProps } from '../../card.types';
import OverviewSectionRow from '../../../overview-section-row';
import { useContext, useMemo, useState } from 'react';
import { UpgradeDbVersionModal } from './upgrade-db-version-modal/upgrade-db-version-modal';
import { useDbVersionsList } from 'components/cluster-form/db-version/useDbVersions';
import { useUpdateDbClusterVersion } from 'hooks/api/db-cluster/useUpdateDbCluster';
import { DbClusterContext } from '../../../../dbCluster.context';
import {DbClusterStatus} from "../../../../../../shared-types/dbCluster.types";

export const BasicInformationSection = ({
  loading,
  type,
  name,
  namespace,
  version,
}: BasicInformationOverviewCardProps) => {
  const [openEditModal, setOpenEditModal] = useState(false);
  const handleCloseModal = () => {
    setOpenEditModal(false);
  };
  const { dbCluster, refetch } = useContext(DbClusterContext);
  const { mutateAsync: updateDbClusterVersion, isPending } =
    useUpdateDbClusterVersion();

  const handleSubmit = async (dbVersion: string) => {
    await updateDbClusterVersion({
      clusterName: dbCluster!.metadata?.name,
      namespace: dbCluster!.metadata?.namespace,
      dbCluster: dbCluster!,
      dbVersion,
    });
    await refetch();
    handleCloseModal();
  };

  const dbVersionsUpgradeList = useDbVersionsList({
    namespace,
    dbType: type,
    currentVersion: version,
  });

  const shouldShowUpgrade = useMemo(() => {
    if (dbVersionsUpgradeList && dbCluster?.status?.status === DbClusterStatus.ready) {
      const engineVersions = dbVersionsUpgradeList?.availableVersions?.engine;
      if (engineVersions?.length === 0) {
        return false;
      }
      return !(
        engineVersions?.length === 1 &&
        engineVersions?.find((item) => item.version === version)
      );
    }
    return false;
  }, [dbVersionsUpgradeList, version]);

  return (
    <OverviewSection
      dataTestId="basic-information"
      title={Messages.titles.basicInformation}
      loading={loading}
      {...(shouldShowUpgrade
        ? {
            actionButtonProps: {
              onClick: () => {
                setOpenEditModal(true);
              },
              disabled: isPending,
              children: 'Upgrade',
            },
          }
        : undefined)}
    >
      <OverviewSectionRow
        label="Type"
        contentString={beautifyDbTypeName(type)}
      />
      <OverviewSectionRow label="Name" contentString={name} />
      <OverviewSectionRow label="Namespace" contentString={namespace} />
      <OverviewSectionRow label="Version" contentString={version} />
      {openEditModal && shouldShowUpgrade && dbVersionsUpgradeList && (
        <UpgradeDbVersionModal
          open={openEditModal}
          handleCloseModal={handleCloseModal}
          handleSubmitModal={handleSubmit}
          dbVersionsUpgradeList={dbVersionsUpgradeList}
          version={version}
        />
      )}
    </OverviewSection>
  );
};
