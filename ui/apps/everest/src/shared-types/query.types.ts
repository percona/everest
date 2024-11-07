import { DefaultError, QueryKey, UseQueryOptions } from '@tanstack/react-query';

// These shenanigans allow us to have 'queryKey' as optional on queryOptions
export type PerconaQueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Partial<
  Pick<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey'>
> &
  Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey'>;
