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

  return (
    <>
      <PreviewContentText text={`Nº nodes: ${intNumberOfNodes}`} />
      {sharding && (
        <>
          <PreviewContentText text={`Shards: ${shardNr}`} />
          <PreviewContentText
            text={`Configuration servers: ${shardConfigServers}`}
          />
        </>
      )}
      <PreviewContentText
        text={`CPU: ${Number.isNaN(parsedCPU) ? '' : `${parsedCPU.toFixed(2)} CPU`}`}
      />
      <PreviewContentText
        text={`Memory: ${
          Number.isNaN(parsedMemory) ? '' : `${parsedMemory.toFixed(2)} GB`
        }`}
      />
      <PreviewContentText
        text={`Disk: ${Number.isNaN(parsedDisk) ? '' : `${parsedDisk.toFixed(2)} ${diskUnit}`}`}
      />
      <PreviewContentText
        text={`Nº ${proxyUnitNames.plural}: ${intNumberOfProxies}`}
        mt={2}
      />
      <PreviewContentText
        text={`CPU: ${Number.isNaN(parsedProxyCPU) ? '' : `${parsedProxyCPU.toFixed(2)} CPU`}`}
      />
      <PreviewContentText
        text={`Memory: ${
          Number.isNaN(parsedProxyMemory)
            ? ''
            : `${parsedProxyMemory.toFixed(2)} GB`
        }`}
      />
    </>
  );
};
