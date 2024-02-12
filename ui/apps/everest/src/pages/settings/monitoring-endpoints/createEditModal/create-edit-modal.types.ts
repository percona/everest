import { z } from 'zod';
import { MonitoringInstance } from 'shared-types/monitoring.types';
import { rfc_123_schema } from 'utils/common-validation';

export enum EndpointFormFields {
  name = 'name',
  namespaces = 'targetNamespaces',
  url = 'url',
  user = 'user',
  password = 'password',
}

export interface CreateEditEndpointModalProps {
  open: boolean;
  handleClose: () => void;
  handleSubmit: (isEditMode: boolean, data: EndpointFormType) => void;
  selectedEndpoint?: MonitoringInstance;
  isLoading?: boolean;
}

export const endpointSchema = z.object({
  [EndpointFormFields.name]: rfc_123_schema('endpoint name'),
  [EndpointFormFields.namespaces]: z.array(z.string()).nonempty(),
  [EndpointFormFields.url]: z.string().min(1).url(),
  [EndpointFormFields.user]: z.string().min(1),
  [EndpointFormFields.password]: z.string().min(1),
});

export const endpointDefaultValues = {
  [EndpointFormFields.name]: '',
  [EndpointFormFields.namespaces]: [],
  [EndpointFormFields.url]: '',
  [EndpointFormFields.user]: '',
  [EndpointFormFields.password]: '',
};

export type EndpointFormType = z.infer<typeof endpointSchema>;
