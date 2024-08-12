import { ResourcesFormFields } from '../../../../../database-form/database-form-body/steps/resources/resources-fields';
import { dbEngineToDbType } from '@percona/utils';
import { DbCluster } from '../../../../../../shared-types/dbCluster.types';
import { DbWizardFormFields } from '../../../../../database-form/database-form.types';
import { useKubernetesClusterResourcesInfo } from '../../../../../../hooks/api/kubernetesClusters/useKubernetesClusterResourcesInfo';
import { useFormContext } from 'react-hook-form';

interface ResourcesEditModalContentProps {
  dbCluster: DbCluster;
}
export const ResourcesEditModalContent = ({
  dbCluster,
}: ResourcesEditModalContentProps) => {
  const { watch } = useFormContext();
  const { data: resourcesInfo, isFetching: resourcesInfoLoading } =
    useKubernetesClusterResourcesInfo();

  const cpu: number = watch(DbWizardFormFields.cpu);
  const memory: number = watch(DbWizardFormFields.memory);
  const disk: number = watch(DbWizardFormFields.disk);

  const cpuCapacityExceeded = resourcesInfo
    ? cpu * 1000 > resourcesInfo?.available.cpuMillis
    : !resourcesInfoLoading;
  const memoryCapacityExceeded = resourcesInfo
    ? memory * 1000 ** 3 > resourcesInfo?.available.memoryBytes
    : !resourcesInfoLoading;
  const diskCapacityExceeded = resourcesInfo?.available?.diskSize
    ? disk * 1000 ** 3 > resourcesInfo?.available.diskSize
    : false;

  return (
    <ResourcesFormFields
      dbType={dbEngineToDbType(dbCluster?.spec?.engine?.type)}
      cpuCapacityExceeded={cpuCapacityExceeded}
      numberOfNodes=""
      memoryCapacityExceeded={memoryCapacityExceeded}
      diskCapacityExceeded={diskCapacityExceeded}
      mode="edit"
    />
  );
};
