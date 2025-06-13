import { DbType } from '@percona/types';
import { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { ResourcesForm, resourcesFormSchema } from 'components/cluster-form';
import { FormDialog } from 'components/form-dialog';
import { useKubernetesClusterInfo } from 'hooks';

type Props = {
  handleCloseModal: () => void;
  dbType: DbType;
  shardingEnabled: boolean;
  onSubmit: SubmitHandler<z.infer<ReturnType<typeof resourcesFormSchema>>>;
  defaultValues: z.infer<ReturnType<typeof resourcesFormSchema>>;
  storageClass: string;
  allowDiskDescaling: boolean;
};

const ResourcesEditModal = ({
  handleCloseModal,
  dbType,
  shardingEnabled,
  onSubmit,
  defaultValues,
  storageClass,
  allowDiskDescaling,
}: Props) => {
  const { data: clusterInfo } = useKubernetesClusterInfo(['cluster-info'], 'in-cluster');
  const allowVolumeExpansion = (clusterInfo?.storageClasses || []).find(
    (item) => item.metadata.name === storageClass
  )?.allowVolumeExpansion;

  return (
    <FormDialog
      dataTestId="edit-resources"
      size="XXXL"
      isOpen
      closeModal={handleCloseModal}
      headerMessage="Edit Topology"
      submitMessage="Save"
      schema={resourcesFormSchema(
        defaultValues,
        false,
        false,
        allowDiskDescaling
      )}
      onSubmit={onSubmit}
      defaultValues={defaultValues}
    >
      <ResourcesForm
        dbType={dbType}
        pairProxiesWithNodes={false}
        showSharding={dbType === DbType.Mongo}
        disableDiskInput={!allowVolumeExpansion}
        defaultValues={defaultValues}
        allowDiskInputUpdate={false}
        hideProxies={dbType === DbType.Mongo && !shardingEnabled}
      />
    </FormDialog>
  );
};

export default ResourcesEditModal;
