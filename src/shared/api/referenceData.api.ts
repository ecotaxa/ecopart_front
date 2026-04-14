import { http } from "@/shared/api/http";

// ============================================================================
// REFERENCE DATA API
// ============================================================================
// Centralized API functions for fetching reference data (instruments, ships, 
// organisations) from the backend. This ensures consistency and reusability 
// across all components that need this data.
// ============================================================================

// --- TYPES ---

/**
 * Interface for Instrument Model from the backend.
 * Matches the database table 'instrument_model'.
 */
export interface InstrumentModel {
    instrument_model_id: number;
    instrument_model_name: string;
    bodc_url?: string;
    instrument_model_creation_date?: string;
}

/**
 * Interface for Ship from the backend.
 * Matches the database table 'ship'.
 */
export interface Ship {
    ship_id: number;
    ship_name: string;
    ship_creation_date?: string;
}

/**
 * Interface for Organisation from the backend.
 * Matches the database table 'organisation'.
 */
export interface Organisation {
    organisation_id: number;
    organisation_name: string;
    organisation_creation_date?: string;
}

// --- RESPONSE WRAPPERS ---
// Backend wraps arrays in objects with named properties

interface InstrumentModelsResponse {
    instrument_models: InstrumentModel[];
}

interface ShipsResponse {
    ships: Ship[];
}

interface OrganisationsResponse {
    organisations: Organisation[];
}

// --- API FUNCTIONS ---

/**
 * Fetches all available instrument models from the backend.
 * Endpoint: GET /instrument_models
 * 
 * @returns Promise<InstrumentModel[]> - Array of instrument models sorted by name
 */
export async function getInstrumentModels(): Promise<InstrumentModel[]> {
    const params = new URLSearchParams({
        page: "1",
        limit: "1000",
        sort_by: "asc(instrument_model_name)"
    });

    const response = await http<InstrumentModelsResponse | InstrumentModel[]>(`/instrument_models?${params.toString()}`);
    
    // Handle both wrapped and direct array responses
    if (Array.isArray(response)) {
        return response;
    }
    return response.instrument_models || [];
}

/**
 * Fetches all available ships from the backend.
 * Endpoint: GET /projects/ships
 * 
 * @returns Promise<string[]> - Array of unique ship names (deduplicated and split)
 */
export async function getShips(): Promise<string[]> {
    const params = new URLSearchParams({
        page: "1",
        limit: "1000",
        sort_by: "asc(ship_name)"
    });

    const response = await http<string[] | ShipsResponse>(`/projects/ships?${params.toString()}`);
    
    let rawShips: string[] = [];
    
    // Handle both direct string array and wrapped object responses
    if (Array.isArray(response)) {
        rawShips = response;
    } else {
        rawShips = (response.ships || []).map((ship) => ship?.ship_name).filter(Boolean) as string[];
    }
    
    // Split comma-separated values and flatten into unique individual ships
    const allShips = rawShips
        .flatMap((name) => name.split(',').map((s) => s.trim()))
        .filter((name): name is string => Boolean(name));
    
    // Return unique values sorted alphabetically
    return [...new Set(allShips)].sort((a, b) => a.localeCompare(b));
}

/**
 * Fetches all available organisations from the backend.
 * Endpoint: GET /users/organisations
 * 
 * @returns Promise<string[]> - Array of organisation names
 */
export async function getOrganisations(): Promise<string[]> {
    const params = new URLSearchParams({
        page: "1",
        limit: "1000",
        sort_by: "asc(organisation_name)"
    });

    const response = await http<string[] | OrganisationsResponse>(`/users/organisations?${params.toString()}`);
    
    // Handle both direct string array and wrapped object responses
    if (Array.isArray(response)) {
        // Filter out any empty or undefined values
        return response.filter((name): name is string => Boolean(name));
    }
    // If wrapped in object, extract the array and map to names
    return (response.organisations || [])
        .map((org) => org?.organisation_name)
        .filter((name): name is string => Boolean(name));
}
