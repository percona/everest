import { PreviewContentText } from '../preview-section';
import { SectionProps } from './section.types';

export const ResourcesPreviewSection = ({
  numberOfNodes,
  cpu,
  disk,
  diskUnit,
  memory,
}: SectionProps) => {
  const parsedCPU = Number(cpu) * Number(numberOfNodes);
  const parsedDisk = Number(disk) * Number(numberOfNodes);
  const parsedMemory = Number(memory) * Number(numberOfNodes);

  return (
    <>
      <PreviewContentText text={`Nº nodes: ${numberOfNodes}`} />
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
    </>
  );
};
