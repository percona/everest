export type EverestConfigPayload = {
  oidc?: {
    authority: string;
    client_id: string;
  };
};

export type EverestConfig = {
  oidc?: {
    authority: string;
    clientId: string;
    redirectUri?: string;
  };
};
