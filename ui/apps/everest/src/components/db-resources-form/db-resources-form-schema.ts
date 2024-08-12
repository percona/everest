import { z } from 'zod';
import { ResourceSize } from './db-resources-form.types';
import { DbResourcesFields } from './db-resources-form.types';

const resourceToNumber = (minimum = 0) =>
  z.union([z.string().nonempty(), z.number()]).pipe(
    z.coerce
      .number({
        invalid_type_error: 'Please enter a valid number',
      })
      .min(minimum)
  );

export const dbResourcesSchemaObject = {
  [DbResourcesFields.cpu]: resourceToNumber(0.6),
  [DbResourcesFields.memory]: resourceToNumber(0.512),
  [DbResourcesFields.disk]: resourceToNumber(1),
  [DbResourcesFields.resourceSizePerNode]: z.nativeEnum(ResourceSize),
  [DbResourcesFields.numberOfNodes]: z.string(),
};

export const dbResourcesFormSchema = z.object(dbResourcesSchemaObject);
