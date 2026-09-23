import { http } from "@/shared/api/http";
import type { SearchFilter, SearchInfo } from "@/shared/types/api";

/**
 * A user row as returned by POST /users/searches.
 *
 * For an admin caller the backend returns the full `UserResponseModel`
 * (see ecopart_back search-users.ts → adminGetUsers), so `valid_email` and
 * `deleted` are present and drive the account-status column of the admin
 * console. `manager_count` and `member_count` are NOT part of the user model —
 * the admin USERS tab derives them client-side (`countProjectsForUser`), so
 * they stay optional and are filled in once that lookup resolves.
 */
export interface AdminUser {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    organisation: string;
    country: string;
    user_planned_usage: string;
    is_admin: boolean;
    user_creation_utc_date_time: string;
    valid_email?: boolean;
    deleted?: string | null;

    // Not backend-provided (see note above); rendered as "—" when absent.
    manager_count?: number;
    member_count?: number;
}

export interface UserSearchResponse {
    search_info: SearchInfo;
    users: AdminUser[];
}

export interface UserSearchParams {
    page: number;
    limit: number;
    filters: SearchFilter[];
    sort_by?: string;
}

/**
 * Search users. POST /users/searches with pagination in the query string and
 * an array of filters in the body. Used by the admin console and, with no
 * filter, to list the users a project can grant privileges to.
 */
export async function searchUsers(params: UserSearchParams): Promise<UserSearchResponse> {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
    });

    if (params.sort_by) {
        query.set("sort_by", params.sort_by);
    }

    return http<UserSearchResponse>(`/users/searches?${query.toString()}`, {
        method: "POST",
        body: JSON.stringify(params.filters ?? []),
    });
}

/**
 * Fetch all active users from the backend (privileges dropdowns).
 */
export async function fetchActiveUsers(): Promise<UserSearchResponse> {
    // We only want valid, non-deleted users (handled by backend or we enforce it)
    return searchUsers({ page: 1, limit: 100, filters: [] });
}

/**
 * Fetch a single user by id. The backend has no GET /users/:id, so we go through
 * the search endpoint with an exact user_id filter. Used by the settings page
 * when an admin edits someone else's account.
 */
export async function getUserById(userId: number): Promise<AdminUser | null> {
    const response = await searchUsers({
        page: 1,
        limit: 1,
        filters: [{ field: "user_id", operator: "=", value: userId }],
    });
    return response.users?.[0] ?? null;
}

/**
 * Resolve emails to EcoPart accounts (project people verification icons).
 * One `email IN (...)` search; emails are lowercased because the backend
 * normalizes them at registration. Deleted / unconfirmed accounts (only
 * visible to an admin caller) are dropped so "found" always means "usable".
 */
export async function findUsersByEmails(emails: string[]): Promise<AdminUser[]> {
    const unique = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
    if (unique.length === 0) return [];

    const response = await searchUsers({
        page: 1,
        limit: unique.length,
        filters: [{ field: "email", operator: "IN", value: unique }],
    });
    return (response.users ?? []).filter((user) => !user.deleted && user.valid_email !== false);
}
