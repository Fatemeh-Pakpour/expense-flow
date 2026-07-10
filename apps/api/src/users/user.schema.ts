import { z } from 'zod';
import { UserRole } from '@prisma-client';

export const UserSchema = z.object({
    id: z.uuid(),
    email: z.email(),
    name: z.string().min(1),
    passwordHash: z.string(),
    role: z.enum(UserRole).default(UserRole.USER),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
