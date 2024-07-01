import { PreviewContentText } from '../preview-section';
import { SectionProps } from './section.types';

export const ResourcesPreviewSection = ({
  numberOfNodes,
  cpu,
  disk,
  memory,
}: SectionProps) => {
  const parsedCPU = Number(cpu) * Number(numberOfNodes);
  const parsedDisk = Number(disk) * Number(numberOfNodes);
  const parsedMemory = Number(memory) * Number(numberOfNodes);

  return (
    <>
      <PreviewContentText text={`Nº nodes: ${numberOfNodes}`} />
      <PreviewContentText
        text={`CPU: ${Number.isNaN(parsedCPU) ? '' : `${parsedCPU} CPU`}`}
      />
      <PreviewContentText
        text={`Memory: ${
          Number.isNaN(parsedMemory) ? '' : `${parsedMemory} GB`
        }`}
      />
      <PreviewContentText
        text={`Disk: ${Number.isNaN(parsedDisk) ? '' : `${parsedDisk} GB`}`}
      />
    </>
  );
};
