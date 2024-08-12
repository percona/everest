import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useKubernetesClusterResourcesInfo } from '../../hooks/api/kubernetesClusters/useKubernetesClusterResourcesInfo';
import { DbResourcesFields, ResourceSize } from './db-resources-form.types';

export const useResourcesForm = ({ mode }: { mode: 'new' | 'edit' }) => {
  const { watch, setValue, setError, clearErrors } = useFormContext();
  const { data: resourcesInfo, isFetching: resourcesInfoLoading } =
    useKubernetesClusterResourcesInfo();

  const cpu: number = watch(DbResourcesFields.cpu);
  const memory: number = watch(DbResourcesFields.memory);
  const disk: number = watch(DbResourcesFields.disk);
  const numberOfNodes = watch(DbResourcesFields.numberOfNodes);
  const resourceSizePerNode: ResourceSize = watch(
    DbResourcesFields.resourceSizePerNode
  );

  const cpuCapacityExceeded = resourcesInfo
    ? cpu * 1000 > resourcesInfo?.available.cpuMillis
    : !resourcesInfoLoading;
  const memoryCapacityExceeded = resourcesInfo
    ? memory * 1000 ** 3 > resourcesInfo?.available.memoryBytes
    : !resourcesInfoLoading;
  const diskCapacityExceeded = resourcesInfo?.available?.diskSize
    ? disk * 1000 ** 3 > resourcesInfo?.available.diskSize
    : false;

  useEffect(() => {
    if (
      resourceSizePerNode !== ResourceSize.custom &&
      cpu !== DEFAULT_SIZES[resourceSizePerNode].cpu
    ) {
      setValue(DbResourcesFields.resourceSizePerNode, ResourceSize.custom);
    }
  }, [cpu]);

  useEffect(() => {
    if (
      resourceSizePerNode !== ResourceSize.custom &&
      disk !== DEFAULT_SIZES[resourceSizePerNode].disk
    ) {
      setValue(DbResourcesFields.resourceSizePerNode, ResourceSize.custom);
    }
  }, [disk]);

  useEffect(() => {
    if (
      resourceSizePerNode !== ResourceSize.custom &&
      memory !== DEFAULT_SIZES[resourceSizePerNode].memory
    ) {
      setValue(DbResourcesFields.resourceSizePerNode, ResourceSize.custom);
    }
  }, [memory]);

  useEffect(() => {
    if (resourceSizePerNode && resourceSizePerNode !== ResourceSize.custom) {
      setValue(DbResourcesFields.cpu, DEFAULT_SIZES[resourceSizePerNode].cpu);
      if (mode !== 'edit') {
        setValue(
          DbResourcesFields.disk,
          DEFAULT_SIZES[resourceSizePerNode].disk
        );
      }
      setValue(
        DbResourcesFields.memory,
        DEFAULT_SIZES[resourceSizePerNode].memory
      );
    }
  }, [resourceSizePerNode, mode, setValue]);

  useEffect(() => {
    if (diskCapacityExceeded) {
      setError(DbResourcesFields.disk, { type: 'custom' });
    } else clearErrors(DbResourcesFields.disk);
  }, [diskCapacityExceeded, clearErrors, setError]);

  return {
    numberOfNodes,
    resourcesInfo,
    cpuCapacityExceeded,
    memoryCapacityExceeded,
    diskCapacityExceeded,
  };
};
