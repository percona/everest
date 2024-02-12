import { useState } from 'react';

export const useDeleteModal = () => {
  const [selectedDbCluster, setSelectedDbCluster] = useState<string>('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  return {
    selectedDbCluster,
    setSelectedDbCluster,
    openDeleteDialog,
    setOpenDeleteDialog,
  };
};
