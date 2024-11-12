import { useNamespaces } from 'hooks/api/namespaces';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  can,
  canAll,
  RBACAction,
  AuthorizerObservable,
  RBACResource,
} from 'utils/rbac';

export const useRBACPermissions = (
  resource: RBACResource,
  specificResources: string | string[]
) => {
  const [permissions, setPermissions] = useState<Record<RBACAction, boolean>>({
    read: false,
    update: false,
    create: false,
    delete: false,
  });

  const checkPermissions = useCallback(async () => {
    const multipleSpecificResources = Array.isArray(specificResources);
    const canRead = await (multipleSpecificResources
      ? canAll('read', resource, specificResources)
      : can('read', resource, specificResources));
    const canDelete = await (multipleSpecificResources
      ? canAll('delete', resource, specificResources)
      : can('delete', resource, specificResources));
    const canUpdate = await (multipleSpecificResources
      ? canAll('update', resource, specificResources)
      : can('update', resource, specificResources));
    const canCreate = await (multipleSpecificResources
      ? canAll('create', resource, specificResources)
      : can('create', resource, specificResources));

    setPermissions({
      read: canRead,
      update: canUpdate,
      delete: canDelete,
      create: canCreate,
    });
  }, [resource, specificResources]);

  useEffect(() => {
    checkPermissions();
    AuthorizerObservable.subscribe(checkPermissions);

    return () => AuthorizerObservable.unsubscribe(checkPermissions);
  }, [checkPermissions]);

  return {
    canRead: permissions.read,
    canUpdate: permissions.update,
    canDelete: permissions.delete,
    canCreate: permissions.create,
  };
};

export const useNamespacePermissionsForResource = (
  resource: RBACResource,
  specificResource = '*'
) => {
  const [permissions, setPermissions] = useState<Record<RBACAction, string[]>>({
    read: [],
    update: [],
    create: [],
    delete: [],
  });
  const { data: namespaces = [], isFetching } = useNamespaces();

  const checkPermissions = useCallback(async () => {
    const newPermissions: Record<RBACAction, string[]> = {
      read: [],
      update: [],
      create: [],
      delete: [],
    };

    namespaces.forEach(async (namespace) => {
      const canRead = await can(
        'read',
        resource,
        `${namespace}/${specificResource}`
      );
      const canUpdate = await can(
        'update',
        resource,
        `${namespace}/${specificResource}`
      );
      const canDelete = await can(
        'delete',
        resource,
        `${namespace}/${specificResource}`
      );
      const canCreate = await can(
        'create',
        resource,
        `${namespace}/${specificResource}`
      );

      if (canRead) {
        newPermissions.read.push(namespace);
      }

      if (canUpdate) {
        newPermissions.update.push(namespace);
      }

      if (canDelete) {
        newPermissions.delete.push(namespace);
      }

      if (canCreate) {
        newPermissions.create.push(namespace);
      }
    });

    setPermissions(newPermissions);
  }, [namespaces, resource, specificResource]);

  useEffect(() => {
    AuthorizerObservable.subscribe(checkPermissions);
    checkPermissions();
  }, [checkPermissions]);

  return {
    canRead: permissions.read,
    canUpdate: permissions.update,
    canCreate: permissions.create,
    canDelete: permissions.delete,
    isFetching,
  };
};

export const useRBACPermissionRoute = (
  permissions: Array<{
    action: RBACAction;
    resource: RBACResource;
    specificResources?: string[];
  }>
) => {
  const navigate = useNavigate();

  const checkPermissions = useCallback(async () => {
    for (let i = 0; i < permissions.length; i++) {
      const { action, resource, specificResources = [] } = permissions[i];
      const allowed = await canAll(action, resource, specificResources);
      if (!allowed) {
        navigate('/');
        return false;
      }
    }
  }, [navigate, permissions]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return true;
};
