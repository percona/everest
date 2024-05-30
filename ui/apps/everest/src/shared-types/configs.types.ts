export type EverestConfigPayload = {
  oidcConfigg?: {
    issuerURL: string;
    clientId: string;
  };
};

export type EverestConfig = {
  oidc?: {
    authority: string;
    clientId: string;
    redirectUri?: string;
  };
};
