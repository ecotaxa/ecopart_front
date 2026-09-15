import { http } from "@/shared/api/http";

// ============================================================================
// ECOTAXA API
// ============================================================================
// The EcoTaxa instances known to the backend and a user's linked EcoTaxa
// accounts. Used by the profile page (link / unlink), the project forms (pick
// the account a project is linked with) and the data tab (deep links), so it
// lives in shared rather than in one of those features.
// ============================================================================

// --- TYPES ---

export interface EcoTaxaAccountLink {
    ecotaxa_account_id: number;
    ecotaxa_account_ecotaxa_id: number;
    ecotaxa_user_name: string;
    ecotaxa_user_email?: string;
    ecotaxa_user_login?: string;
    ecotaxa_expiration_date: string;
    ecotaxa_account_instance_id: number;
    ecotaxa_account_instance_name: string;
}

/** Mirrors the backend 'ecotaxa_instance' table. */
export interface EcoTaxaInstance {
    ecotaxa_instance_id: number;
    ecotaxa_instance_name: string;
    ecotaxa_instance_description: string;
    ecotaxa_instance_url: string;
    ecotaxa_instance_creation_date?: string; // Optional field from backend
}

// --- API FUNCTIONS ---

/**
 * Get the list of linked EcoTaxa accounts.
 * Endpoint: GET users/:id/ecotaxa_account?page=1&limit=100
 */
export async function getEcoTaxaAccounts(userId: number): Promise<EcoTaxaAccountLink[]> {
    const params = new URLSearchParams({
        page: "1",
        limit: "100", // Fetch up to 100 accounts to be safe
        sort_by: "asc(ecotaxa_account_expiration_utc_date_time)", // Sort by expiration (column renamed in backend migration 017)
    });

    const res = await http<{ ecotaxa_accounts: EcoTaxaAccountLink[] }>(
        `/users/${userId}/ecotaxa_account?${params.toString()}`
    );

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

/**
 * Fetches all available EcoTaxa instances from the backend.
 * Endpoint: GET /ecotaxa_instances
 */
export async function getEcoTaxaInstances(): Promise<EcoTaxaInstance[]> {
    const response = await http<EcoTaxaInstance[] | { ecotaxa_instances: EcoTaxaInstance[] }>("/ecotaxa_instances");

    // Handle both direct array and wrapped object responses
    if (Array.isArray(response)) {
        return response.filter((inst) => inst && inst.ecotaxa_instance_id);
    }
    return (response.ecotaxa_instances || []).filter((inst) => inst && inst.ecotaxa_instance_id);
}
