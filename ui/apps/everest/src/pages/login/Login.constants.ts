import { z } from 'zod';

export enum LoginFields {
  token = 'token',
}

export const loginSchema = z.object({
  [LoginFields.token]: z.string().min(1, { message: 'Required' }),
});

export type LoginFormType = z.infer<typeof loginSchema>;
