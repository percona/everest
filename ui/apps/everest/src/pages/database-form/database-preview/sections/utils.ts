import { PreviewSectionFive } from './section-five.tsx';
import { BackupsPreviewSection } from './backups-section.tsx';
import { AdvancedConfigurationsPreviewSection } from './advanced-configurations-section.tsx';
import { PreviewSectionOne } from './section-one.tsx';
import { ResourcesPreviewSection } from './resources-section.tsx';
import { PreviewImportSection } from './import-section.tsx';
import { useLocation } from 'react-router-dom';

export const usePreviewSections = () => {
  const location = useLocation();
  const showImportStep = location.state?.showImport;
  return [
    ...(showImportStep
      ? [
          {
            component: PreviewImportSection,
            title: 'Import information',
          },
        ]
      : []),
    { component: PreviewSectionOne, title: 'Basic Information' },
    { component: ResourcesPreviewSection, title: 'Resources' },
    { component: BackupsPreviewSection, title: 'Backups' },
    {
      component: AdvancedConfigurationsPreviewSection,
      title: 'Advanced Configurations',
    },
    { component: PreviewSectionFive, title: 'Monitoring' },
  ];
};
