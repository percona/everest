export type EverestConfigPayload = {
  oidcConfig?: {
    issuerURL: string;
    clientId: string;
    scopes: string[];
  };
};

export type EverestConfig = {
  oidc?: {
    authority: string;
    clientId: string;
    scope: string;
    redirectUri?: string;
  };
};
