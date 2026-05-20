export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type ApiHealthResponse = {
    api: 'ok';
    database: 'ok';
    timestamp: string;
};