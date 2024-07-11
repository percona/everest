import { AuthContext } from 'contexts/auth';
import { useContext, useEffect, useState } from 'react';

type GetPermissionProps = {
  resource: string;
  specificResource?: string;
  namespace?: string;
};

export const useGetPermissions = ({
  resource,
  specificResource = '*',
  namespace = '*',
}: GetPermissionProps) => {
  const [permissions, setPermissions] = useState({
    canRead: false,
    canUpdate: false,
    canDelete: false,
    canCreate: false,
  });

  const { authorize } = useContext(AuthContext);

  useEffect(() => {
    authorize('read', resource, specificResource).then((data) => {
      setPermissions((oldPermissions) => ({
        ...oldPermissions,
        canRead: data,
      }));
    });

    authorize('create', resource, specificResource).then((data) => {
      setPermissions((oldPermissions) => ({
        ...oldPermissions,
        canCreate: data,
      }));
    });

    authorize('update', resource, `${namespace}/${specificResource}`).then(
      (data) => {
        setPermissions((oldPermissions) => ({
          ...oldPermissions,
          canUpdate: data,
        }));
      }
    );
    authorize('delete', resource, `${namespace}/${specificResource}`).then(
      (data) => {
        setPermissions((oldPermissions) => ({
          ...oldPermissions,
          canDelete: data,
        }));
      }
    );
  }, [authorize, namespace, resource, specificResource]);

  return permissions;
};
