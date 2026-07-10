// Keep in sync with the `UserRole` enum in apps/api/prisma/schema.prisma.
export type UserRole = 'USER' | 'ADMIN';

export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type ApiHealthResponse = {
    api: 'ok';
    database: 'ok';
    timestamp: string;
};