import { z } from 'zod';

export enum LoginFields {
  username = 'username',
  password = 'password',
}

export const loginSchema = z.object({
  [LoginFields.username]: z.string().min(1, { message: 'Required' }),
  [LoginFields.password]: z.string().min(1, { message: 'Required' }),
});

export type LoginFormType = z.infer<typeof loginSchema>;
