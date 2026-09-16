import { http } from "@/shared/api/http";
import { type AdminUser, getUserById, searchUsers, type UserSearchParams, type UserSearchResponse } from "@/features/auth/api/users.api";

// The user search (and the row type it returns) lives with the auth feature so
// the settings page can use it without depending on the admin console; the
// admin-only mutations stay here.
export { getUserById, searchUsers };
export type { AdminUser, UserSearchParams, UserSearchResponse };

/**
 * Grant or revoke admin rights for a user.
 * Route: PATCH /users/:user_id/
 */
export async function setUserAdmin(userId: number, isAdmin: boolean): Promise<AdminUser> {
    return http<AdminUser>(`/users/${userId}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_admin: isAdmin }),
    });
}

/**
 * Delete (deactivate) a user account — the same endpoint the profile page's
 * "Delete account" button hits, but targeting an arbitrary user id.
 * Route: DELETE /users/:user_id/
 */
export async function deleteUser(userId: number): Promise<void> {
    return http<void>(`/users/${userId}/`, {
        method: "DELETE",
    });
}
