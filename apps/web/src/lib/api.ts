import type { ApiHealthResponse } from '@expense-flow/shared';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

export async function getApiHealth(): Promise<ApiHealthResponse> {

    const response = await fetch(`${API_BASE_URL}/health`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch API health');
    }

    return response.json();
}