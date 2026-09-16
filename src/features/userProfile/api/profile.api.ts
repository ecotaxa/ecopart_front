import { http } from "@/shared/api/http";
import type { User } from "@/features/auth/types/user";

// The EcoTaxa instance / account calls are shared with the project forms and
// the data tab; they live in shared and are re-exported here for the profile screens.
export {
    getEcoTaxaAccounts,
    getEcoTaxaInstances,
    linkEcoTaxaAccount,
    unlinkEcoTaxaAccount,
    type EcoTaxaAccountLink,
    type EcoTaxaInstance,
} from "@/shared/api/ecotaxa.api";

/**
 * Fetches the current connected user's details.
 * Delegates to the auth API implementation to avoid duplication.
 */
export { fetchMe } from "@/features/auth/api/auth.api";

/** The profile fields a user (or an admin, for the admin flag) may edit. */
export type ProfileUpdatePayload = Partial<
    Pick<User, "first_name" | "last_name" | "organisation" | "country" | "user_planned_usage" | "is_admin">
>;

/**
 * Updates the user profile information.
 * Endpoint: PATCH /users/:id
 * @param userId - The ID of the user to update.
 * @param data - The fields to update (first_name, last_name, etc.).
 */
export async function updateProfile(userId: number, data: ProfileUpdatePayload): Promise<User> {
    return http<User>(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

/**
 * Changes the user's password.
 * Endpoint: POST /auth/password/change
 * Note: The backend requires:
 * 1. user_id
 * 2. password (the CURRENT password)
 * 3. new_password (the NEW password)
 */
export async function changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    return http<void>("/auth/password/change", {
        method: "POST",
        body: JSON.stringify({
            user_id: userId,
            password: oldPassword,    // Maps to backend validator check('password')
            new_password: newPassword // Maps to backend validator check('new_password')
        }),
    });
}

/**
 * Deletes the user account.
 * Endpoint: DELETE /users/:id
 */
export async function deleteAccount(userId: number): Promise<void> {
    return http<void>(`/users/${userId}`, {
        method: "DELETE",
    });
}
