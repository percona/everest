import { CUSTOM_NR_UNITS_INPUT_VALUE } from 'components/cluster-form';
import { PreviewContentText } from '../preview-section';
import { SectionProps } from './section.types';
import { getProxyUnitNamesFromDbType } from 'components/cluster-form/resources/utils';

export const ResourcesPreviewSection = ({
  dbType,
  numberOfNodes,
  customNrOfNodes,
  numberOfProxies,
  customNrOfProxies,
  cpu,
  disk,
  diskUnit,
  memory,
  proxyCpu,
  proxyMemory,
  sharding,
  shardNr,
  shardConfigServers,
}: SectionProps) => {
  const proxyUnitNames = getProxyUnitNamesFromDbType(dbType);
  if (numberOfNodes === CUSTOM_NR_UNITS_INPUT_VALUE) {
    numberOfNodes = customNrOfNodes || '';
  }

  if (numberOfProxies === CUSTOM_NR_UNITS_INPUT_VALUE) {
    numberOfProxies = customNrOfProxies || '';
  }

  let intNumberOfNodes = Math.max(parseInt(numberOfNodes, 10), 0);
  let intNumberOfProxies = Math.max(parseInt(numberOfProxies, 10), 0);

  if (Number.isNaN(intNumberOfNodes)) {
    intNumberOfNodes = 0;
  }

  if (Number.isNaN(intNumberOfProxies)) {
    intNumberOfProxies = 0;
  }

  const parsedCPU = Number(cpu) * intNumberOfNodes;
  const parsedDisk = Number(disk) * intNumberOfNodes;
  const parsedMemory = Number(memory) * intNumberOfNodes;
  const parsedProxyCPU = Number(proxyCpu) * intNumberOfProxies;
  const parsedProxyMemory = Number(proxyMemory) * intNumberOfProxies;

  const nodesText = `${sharding && shardNr ? +shardNr * intNumberOfNodes : intNumberOfNodes} nodes`;
  const nodesCPUText = `CPU - ${Number.isNaN(parsedCPU) ? '' : `${sharding && shardNr ? (+shardNr * parsedCPU).toFixed(2) : parsedCPU.toFixed(2)} CPU`}`;
  const nodesMemoryText = `Memory - ${Number.isNaN(parsedMemory) ? '' : `${sharding && shardNr ? (+shardNr * parsedMemory).toFixed(2) : parsedMemory.toFixed(2)} GB`}`;
  const nodesDiskText = `Disk - ${Number.isNaN(parsedDisk) ? '' : `${sharding && shardNr ? (+shardNr * parsedDisk).toFixed(2) : parsedDisk.toFixed(2)}`} ${diskUnit}`;

  const proxyText = `${intNumberOfProxies} ${proxyUnitNames.plural}`;
  const proxyCPUText = `CPU - ${Number.isNaN(parsedProxyCPU) ? '' : `${parsedProxyCPU.toFixed(2)} CPU`}`;
  const proxyMemoryText = `Memory - ${Number.isNaN(parsedProxyMemory) ? '' : `${parsedProxyMemory.toFixed(2)} GB`}`;

  return (
    <>
      {sharding && (
        <>
          <PreviewContentText text={`${shardNr} shards`} />
          <PreviewContentText
            text={`${shardConfigServers} configuration servers`}
          />
        </>
      )}
      <PreviewContentText
        text={`${nodesText} - ${nodesCPUText}; ${nodesMemoryText}; ${nodesDiskText}`}
      />
      <PreviewContentText
        text={`${proxyText} - ${proxyCPUText}; ${proxyMemoryText}`}
      />
    </>
  );
};
