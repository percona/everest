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
      authorize('create', resource, `${namespace}/*`).then((permitted) => {
        if (permitted === true) {
          setPermittedNamespaces((oldNamespaces) => [
            ...oldNamespaces,
            namespace,
          ]);
        } else {
          setPermittedNamespaces((oldNamespaces) => {
            return oldNamespaces.filter((ns) => ns !== namespace);
          });
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
    authorize('read', resource, specificResource).then((permitted) => {
      setPermissions((oldPermissions) => ({
        ...oldPermissions,
        canRead: permitted,
      }));
    });

    namespaces.forEach((namespace) =>
      authorize('create', resource, `${namespace}/*`).then((permitted) => {
        setPermissions((oldPermissions) => ({
          ...oldPermissions,
          canCreate: permitted,
        }));
      })
    );

    authorize('update', resource, `${namespace}/${specificResource}`).then(
      (permitted) => {
        setPermissions((oldPermissions) => ({
          ...oldPermissions,
          canUpdate: permitted,
        }));
      }
    );
    authorize('delete', resource, `${namespace}/${specificResource}`).then(
      (permitted) => {
        setPermissions((oldPermissions) => ({
          ...oldPermissions,
          canDelete: permitted,
        }));
      }
    );
  }, [authorize, namespace, resource, specificResource]);

  return permissions;
};
