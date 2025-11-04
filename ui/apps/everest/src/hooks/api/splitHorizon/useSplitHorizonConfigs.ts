import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from '@tanstack/react-query';
import {
  createSplitHorizonDNSConfig,
  deleteSplitHorizonDNSConfig,
  getAllSplitHorizonDNSConfigs,
  updateSplitHorizonDNSConfig,
} from 'api/splitHorizon';
import { SplitHorizonDNSConfig } from 'shared-types/splitHorizon.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const useSplitHorizonConfigs = (
  namespace: string,
  options?: PerconaQueryOptions<
    SplitHorizonDNSConfig[],
    unknown,
    SplitHorizonDNSConfig[]
  >
) => {
  return useQuery({
    queryKey: ['split-horizon-configs', namespace],
    queryFn: () => getAllSplitHorizonDNSConfigs(namespace),
    ...options,
  });
};

export const useCreateSplitHorizonConfig = (
  options?: UseMutationOptions<SplitHorizonDNSConfig, unknown, unknown, unknown>
) => {
  return useMutation({
    mutationKey: ['create-split-horizon-config'],
    mutationFn: (args: {
      name: string;
      namespace: string;
      baseDomain: string;
      caCrt: string;
      tlsCrt: string;
      tlsKey: string;
      secretName: string;
    }) => {
      const dnsConfig: SplitHorizonDNSConfig = {
        apiVersion: 'everest.percona.com/v1alpha1',
        kind: 'SplitHorizonDNSConfig',
        metadata: {
          name: args.name,
        },
        spec: {
          baseDomainNameSuffix: args.baseDomain,
          tls: {
            secretName: args.secretName,
            certificate: {
              'ca.crt': args.caCrt,
              'tls.crt': args.tlsCrt,
              'tls.key': args.tlsKey,
            },
          },
        },
        status: {
          inUse: false,
        },
      };
      return createSplitHorizonDNSConfig(args.namespace, dnsConfig);
    },
    ...options,
  });
};

export const useUpdateSplitHorizonConfig = (
  options?: UseMutationOptions<SplitHorizonDNSConfig, unknown, unknown, unknown>
) => {
  return useMutation({
    mutationKey: ['create-split-horizon-config'],
    mutationFn: (args: {
      name: string;
      namespace: string;
      caCrt: string;
      tlsCrt: string;
      tlsKey: string;
      secretName: string;
    }) => {
      const dnsConfig = {
        certificate: {
          'ca.crt': args.caCrt,
          'tls.crt': args.tlsCrt,
          'tls.key': args.tlsKey,
        },
      };
      return updateSplitHorizonDNSConfig(args.namespace, args.name, dnsConfig);
    },
    ...options,
  });
};

export const useDeleteSplitHorizonDNSConfig = (
  options?: UseMutationOptions<SplitHorizonDNSConfig, unknown, unknown, unknown>
) => {
  return useMutation({
    mutationKey: ['delete-split-horizon-config'],
    mutationFn: (args: { name: string; namespace: string }) => {
      return deleteSplitHorizonDNSConfig(args.namespace, args.name);
    },
    ...options,
  });
};
