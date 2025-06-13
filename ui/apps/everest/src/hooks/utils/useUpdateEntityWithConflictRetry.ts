import { AxiosError } from 'axios';
import {
  MutateOptions,
  QueryObserverResult,
  RefetchOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRef } from 'react';
import { enqueueSnackbar } from 'notistack';

const UPDATE_RETRY_TIMEOUT_MS = 5000;
const UPDATE_RETRY_DELAY_MS = 200;

// TODO apply this generic fn to all entities that have generation and resourceVersion, namely db clusters so far
export const useUpdateEntityWithConflictRetry = <
  T extends { metadata: { generation: number; resourceVersion: string } },
>(
  queryKey: string[],
  apiMutationFn: (newEntityData: T) => Promise<T>,
  originalGeneration: number,
  refetch: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<T, unknown>>,
  dataMergerFn: (oldData: T, newData: T) => T,
  mutationOptions?: MutateOptions<T, AxiosError<unknown, unknown>, T, unknown>
) => {
  const {
    onSuccess: ownOnSuccess = () => {},
    onError: ownOnError = () => {},
    ...restMutationOptions
  } = mutationOptions || {};

  const queryClient = useQueryClient();
  const watchStartTime = useRef<number | null>(null);
  const dataToBeSent = useRef<T | null>(null);

  const mutationMethods = useMutation<T, AxiosError, T, unknown>({
    mutationFn: (entity: T) => {
      dataToBeSent.current = entity;
      return apiMutationFn(dataToBeSent.current);
    },
    onError: async (error, vars, ctx) => {
      const { status } = error;

      if (status === 409) {
        if (watchStartTime.current === null) {
          watchStartTime.current = Date.now();
        }

        const timeDiff = Date.now() - watchStartTime.current;

        if (timeDiff > UPDATE_RETRY_TIMEOUT_MS) {
          enqueueSnackbar(
            'There is a conflict with the current object definition.',
            {
              variant: 'error',
            }
          );
          ownOnError?.(error, vars, ctx);
          watchStartTime.current = null;
          return;
        }

        return new Promise<void>((resolve) =>
          setTimeout(async () => {
            const { data: freshData } = await refetch();

            if (freshData) {
              const { generation, resourceVersion } = freshData.metadata;

              if (generation === originalGeneration) {
                resolve();
                mutationMethods.mutate({
                  ...dataToBeSent.current!,
                  metadata: { ...freshData.metadata, resourceVersion },
                });
              } else {
                enqueueSnackbar(
                  'The object definition has been changed somewhere else. Please re-apply your changes.',
                  {
                    variant: 'error',
                  }
                );
                ownOnError?.(error, vars, ctx);
                watchStartTime.current = null;
                resolve();
              }
            } else {
              watchStartTime.current = null;
              ownOnError?.(error, vars, ctx);
              resolve();
            }
          }, UPDATE_RETRY_DELAY_MS)
        );
      }

      ownOnError?.(error, vars, ctx);
      return;
    },
    onSuccess: (data, vars, ctx) => {
      watchStartTime.current = null;
      queryClient.setQueryData<T>(queryKey, (oldData) =>
        oldData ? dataMergerFn(oldData, data) : data
      );
      ownOnSuccess?.(data, vars, ctx);
    },
    ...restMutationOptions,
  });

  return mutationMethods;
};
