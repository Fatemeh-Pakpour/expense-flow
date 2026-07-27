import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma-client';
import { hashPassword } from './password.util';
import { RegisterUserInput, RegisterUserSchema } from './user.schema';
import { UserRepository } from './user.repository';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
    constructor(private readonly users: UserRepository) { }

    async register(input: RegisterUserInput): Promise<SafeUser> {
        const parsed = RegisterUserSchema.safeParse(input);
        if (!parsed.success) {
            throw new BadRequestException(parsed.error.issues);
        }
        const { email, name, password } = parsed.data;

        // Hash the plaintext password — the DB never sees it in the clear.
        const passwordHash = await hashPassword(password);

        // Persist. Role is omitted, so Prisma applies the DB default (USER) —
        // clients cannot self-assign a role. A duplicate email trips the unique
        // constraint (P2002), which PrismaExceptionFilter maps to 409 Conflict.
        const user = await this.users.create({ email, name, passwordHash });
        return this.stripHash(user);
    }

    private stripHash(user: User): SafeUser {
        const { passwordHash: _omit, ...safe } = user;
        return safe;
    }
}
