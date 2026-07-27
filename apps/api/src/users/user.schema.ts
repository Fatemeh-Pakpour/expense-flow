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

/**
 * What the public registration endpoint accepts.
 * - Takes a plaintext `password` (server hashes it) — never a `passwordHash`.
 * - Deliberately omits `role` so a client cannot self-assign ADMIN.
 * - Normalizes email to lowercase/trimmed so uniqueness is case-insensitive.
 */
export const RegisterUserSchema = z.object({
    email: z.email().trim().toLowerCase(),
    name: z.string().trim().min(1).max(255),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters'),
});

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
