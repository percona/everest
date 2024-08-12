import { z } from 'zod';
import { DbWizardFormFields } from '../../../../../database-form/database-form.types';
import { ResourceSize } from '../../../../../../components/db-resources-form/db-resources-form.types';
import { resourcesSchema } from '../../../../../database-form/database-form-schema';
import { DbCluster } from '../../../../../../shared-types/dbCluster.types';

export interface ResourcesEditDialogProps {
  open: boolean;
  handleCloseModal: () => void;
  handleSubmitModal: (
    cpu: number,
    memory: number,
    disk: number,
    numberOfNodes: number
  ) => void;
  dbCluster: DbCluster;
}

export const resourcesEditDialogDefaultValues = (
  cpu: string,
  memory: string,
  disk: string,
  resourceSize: ResourceSize,
  numberOfNodes: number
) => ({
  [DbWizardFormFields.cpu]: cpu,
  [DbWizardFormFields.memory]: memory,
  [DbWizardFormFields.disk]: disk,
  [DbWizardFormFields.resourceSizePerNode]: resourceSize,
  [DbWizardFormFields.numberOfNodes]: numberOfNodes,
});

export type EditResourceDialogType = z.infer<typeof resourcesSchema>;
