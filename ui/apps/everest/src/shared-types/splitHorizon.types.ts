export type SplitHorizonDNSConfig = {
  baseDomainNameSuffix: string;
  tls: {
    secretName: string;
    certificate: {
      certFile: string;
      keyFile: string;
      caCertFile: string;
    };
  };
};
