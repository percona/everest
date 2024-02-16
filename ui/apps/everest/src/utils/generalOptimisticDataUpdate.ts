import { QueryClient } from 'react-query';

export const updateDataAfterEdit =
  (
    queryClient: QueryClient,
    queryKey: string,
    identifier: string | undefined = 'id'
  ) =>
  <T extends object>(updatedObject: T) => {
    queryClient.setQueryData([queryKey], (oldData?: T[]) => {
      return (oldData || []).map((value) =>
        // @ts-ignore
        value[identifier] === updatedObject[identifier] ? updatedObject : value
      );
    });
  };

export const updateDataAfterCreate =
  (queryClient: QueryClient, queryKey: string) =>
  <T extends object>(createdObject: T) => {
    queryClient.setQueryData([queryKey], (oldData?: T[]) => {
      return [createdObject, ...(oldData || [])];
    });
  };

export const updateDataAfterDelete =
  (
    queryClient: QueryClient,
    queryKey: string,
    identifier: string | undefined = 'id'
  ) =>
  <T extends object>(_: T, objectId: string) => {
    queryClient.setQueryData([queryKey], (oldData?: T[]) => {
      // @ts-ignore
      return (oldData || []).filter((value) => value[identifier] !== objectId);
    });
  };
