import { http } from "@/shared/api/http";

export interface UserSearchResponse {
    search_info: {
        total: number;
        page: number;
        limit: number;
    };
    users: Array<{
        user_id: number;
        first_name: string;
        last_name: string;
        email: string;
    }>;
}

/**
 * Fetch all active users from the backend
 */
export async function fetchActiveUsers(): Promise<UserSearchResponse> {
    return http<UserSearchResponse>('/users/searches?page=1&limit=100', {
        method: 'POST',
        // We only want valid, non-deleted users (handled by backend or we enforce it)
        body: JSON.stringify([])
    });
}