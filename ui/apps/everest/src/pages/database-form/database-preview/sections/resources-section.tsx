import { CUSTOM_NODES_NR_INPUT_VALUE } from 'components/cluster-form';
import { PreviewContentText } from '../preview-section';
import { SectionProps } from './section.types';

export const ResourcesPreviewSection = ({
  numberOfNodes,
  customNrOfNodes,
  cpu,
  disk,
  memory,
}: SectionProps) => {
  if (numberOfNodes === CUSTOM_NODES_NR_INPUT_VALUE) {
    numberOfNodes = customNrOfNodes || '';
  }

  let intNumberOfNodes = Math.max(parseInt(numberOfNodes, 10), 0);

  if (Number.isNaN(intNumberOfNodes)) {
    intNumberOfNodes = 0;
  }

  const parsedCPU = Number(cpu) * intNumberOfNodes;
  const parsedDisk = Number(disk) * intNumberOfNodes;
  const parsedMemory = Number(memory) * intNumberOfNodes;

  return (
    <>
      <PreviewContentText text={`Nº nodes: ${intNumberOfNodes}`} />
      <PreviewContentText
        text={`CPU: ${Number.isNaN(parsedCPU) ? '' : `${parsedCPU.toFixed(2)} CPU`}`}
      />
      <PreviewContentText
        text={`Memory: ${
          Number.isNaN(parsedMemory) ? '' : `${parsedMemory.toFixed(2)} GB`
        }`}
      />
      <PreviewContentText
        text={`Disk: ${Number.isNaN(parsedDisk) ? '' : `${parsedDisk.toFixed(2)} GB`}`}
      />
    </>
  );
};
