import { http } from "@/shared/api/http";
import type { User } from "@/features/auth/types/user";

// --- TYPES ---
// Based on the backend response structure
export interface EcoTaxaAccountLink {
    ecotaxa_account_id: number;
    ecotaxa_account_ecotaxa_id: number;
    ecotaxa_user_name: string;
    ecotaxa_user_login?: string
    ecotaxa_expiration_date: string;
    ecotaxa_account_instance_id: number;
    ecotaxa_account_instance_name: string;
}

/**
 * Fetches the current connected user's details.
 * Delegates to the auth API implementation to avoid duplication.
 */
export { fetchMe } from "@/features/auth/api/auth.api";

/**
 * Updates the user profile information.
 * Endpoint: PATCH /users/:id
 * @param userId - The ID of the user to update.
 * @param data - The fields to update (first_name, last_name, etc.).
 */
export async function updateProfile(userId: number, data: Partial<User>): Promise<User> {
    return http<User>(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

/**
 * Changes the user's password.
 * Endpoint: POST /auth/password/change
 * * Note: The backend requires:
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

/**
 * Get the list of linked EcoTaxa accounts.
 * Endpoint: GET users/:id/ecotaxa_account?page=1&limit=100
 */
export async function getEcoTaxaAccounts(userId: number): Promise<EcoTaxaAccountLink[]> {
    // 1. We create search parameters to match the Postman request
    const params = new URLSearchParams({
        page: "1",
        limit: "100", // Fetch up to 100 accounts to be safe
        sort_by: "asc(ecotaxa_account_expiration_date)" // Sort by expiration like in Postman
    });

    // 2. We append the query string to the URL
    const res = await http<{ ecotaxa_accounts: EcoTaxaAccountLink[] }>(
        `/users/${userId}/ecotaxa_account?${params.toString()}`
    );

    // 3. Return the array (or an empty array if undefined/null)
    return res.ecotaxa_accounts || []; 
}

/**
 * Unlink (remove) a specific EcoTaxa account connection.
 * Endpoint: DELETE users/:userId/ecotaxa_account/:connectionId
 */
export async function unlinkEcoTaxaAccount(userId: number, connectionId: number): Promise<void> {
    return http<void>(`/users/${userId}/ecotaxa_account/${connectionId}`, {
        method: "DELETE",
    });
}

/**
 * Link an external EcoTaxa account to the current user.
 * Endpoint: POST users/:id/ecotaxa_account
 */
export async function linkEcoTaxaAccount(
    userId: number,
    instanceId: number,
    email: string,
    password: string
): Promise<void> {

    const params = new URLSearchParams();
    params.append("ecotaxa_user_login", email);
    params.append("ecotaxa_user_password", password);
    params.append("ecotaxa_instance_id", String(instanceId));

    return http<void>(`/users/${userId}/ecotaxa_account`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    });
}
