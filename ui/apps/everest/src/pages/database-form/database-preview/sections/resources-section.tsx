import { CUSTOM_NR_UNITS_INPUT_VALUE } from 'components/cluster-form';
import { PreviewContentText } from '../preview-section';
import { SectionProps } from './section.types';
import { getPreviewResourcesText, getProxyUnitNamesFromDbType } from 'utils/db';
import { DbType } from '@percona/types';

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
  const parsedShardNr = shardNr ? Number.parseInt(shardNr) : undefined;
  const nodesTotalNumber =
    sharding && shardNr ? +shardNr * intNumberOfNodes : intNumberOfNodes;

  const nodesText = `${nodesTotalNumber} ${nodesTotalNumber === 1 ? 'node' : 'nodes'}`;

  const nodesCPUText = getPreviewResourcesText(
    'CPU',
    parsedCPU,
    sharding,
    'CPU',
    parsedShardNr
  );
  const nodesMemoryText = getPreviewResourcesText(
    'Memory',
    parsedMemory,
    sharding,
    'GB',
    parsedShardNr
  );
  const nodesDiskText = getPreviewResourcesText(
    'Disk',
    parsedDisk,
    sharding,
    diskUnit,
    parsedShardNr
  );

  const proxyText = `${intNumberOfProxies} ${intNumberOfProxies === 1 ? proxyUnitNames.singular : proxyUnitNames.plural}`;
  const proxyCPUText = getPreviewResourcesText(
    'CPU',
    parsedProxyCPU,
    sharding,
    'CPU'
  );
  const proxyMemoryText = getPreviewResourcesText(
    'Memory',
    parsedProxyMemory,
    sharding,
    'GB'
  );

  return (
    <>
      {sharding && (
        <>
          <PreviewContentText text={`${shardNr} shards`} />
        </>
      )}
      <PreviewContentText
        text={`${nodesText} - ${nodesCPUText}; ${nodesMemoryText}; ${nodesDiskText}`}
      />
      {(dbType !== DbType.Mongo || sharding) && (
        <PreviewContentText
          text={`${proxyText} - ${proxyCPUText}; ${proxyMemoryText}`}
        />
      )}
      {sharding && (
        <>
          <PreviewContentText
            text={`${shardConfigServers} configuration servers`}
          />
        </>
      )}
    </>
  );
};
