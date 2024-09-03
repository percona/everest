import { AuthContext } from 'contexts/auth';
import { useNamespaces } from 'hooks/api/namespaces';
import { useContext, useEffect, useState } from 'react';

type GetPermissionProps = {
  resource: string;
  specificResource?: string;
  namespace?: string;
};

export const useGetPermittedNamespaces = ({
  resource,
}: {
  resource: string;
}) => {
  const { data: namespaces = [], isFetching } = useNamespaces();

  const { authorize } = useContext(AuthContext);

  const [permittedNamespaces, setPermittedNamespaces] = useState<string[]>([]);

  useEffect(() => {
    namespaces.forEach((namespace) =>
      authorize('create', resource, `${namespace}/*`).then((data) => {
        if (data === true) {
          setPermittedNamespaces((oldPermissions) => [
            ...oldPermissions,
            namespace,
          ]);
        }
      })
    );
  }, [authorize, namespaces, resource]);

  return {
    permittedNamespaces: [...new Set(permittedNamespaces)],
    canCreate: permittedNamespaces.length > 0,
    isFetching: isFetching,
  };
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
    canCreate: true,
  });

  const { authorize } = useContext(AuthContext);

  const { data: namespaces = [] } = useNamespaces();

  useEffect(() => {
    authorize('read', resource, specificResource).then((data) => {
      setPermissions((oldPermissions) => ({
        ...oldPermissions,
        canRead: data,
      }));
    });

    namespaces.forEach((namespace) =>
      authorize('create', resource, `${namespace}/*`).then((data) => {
        if (data === false) {
          setPermissions((oldPermissions) => ({
            ...oldPermissions,
            canCreate: data,
          }));
        }
      })
    );

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
