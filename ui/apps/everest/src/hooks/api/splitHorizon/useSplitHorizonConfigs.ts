import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from '@tanstack/react-query';
import {
  createSplitHorizonDNSConfig,
  getAllSplitHorizonDNSConfigs,
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
      };
      return createSplitHorizonDNSConfig(args.namespace, dnsConfig);
    },
    ...options,
  });
};
