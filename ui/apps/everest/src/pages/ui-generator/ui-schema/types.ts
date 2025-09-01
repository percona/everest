export type OpenAPIObjectProperties = {
  label?: string;
  badge?: string;
  options?: { label: string; value: string }[];
  placeholder?: string;
  default?: string;
};

export type ComponentProperties = {
  uiType?: string;
  label?: string;
  description?: string;
  default?: string | number;
  validation?: { [key: string]: string | number };
  params?: OpenAPIObjectProperties;
  subParameters?: { [key: string]: ComponentProperties };
};

export type OpenAPIObject = {
  global: {
    [key: string]: ComponentProperties;
  };
  components: {
    [key: string]: {
      [key: string]: ComponentProperties;
    };
  };
  topologySchema: {
    [key: string]: {
      [key: string]: ComponentProperties;
    };
  };
};

export type FieldGroup = {
  groupId: string;
  title: string;
  description: string;
};

export type Field = {
  name: string;
} & OpenAPIObjectProperties;

export type OpenAPIFields = {
  global: {
    properties: { [key: string]: ComponentProperties };
  };
  components: {
    [key: string]: {
      properties: { [key: string]: ComponentProperties };
    };
  };
  topology: {
    [key: string]: {
      properties: { [key: string]: ComponentProperties };
    };
  };
};
