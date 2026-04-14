import { http } from "@/shared/api/http";

export interface Project {
    project_id: number;
    title: string;
    instrument: string;
    ecotaxa_project_name: string;
    root_folder: string;
    nbr_sample: number;
    privilege: string;
    qc_state: string;
}

/**
 * Represents a single search filter condition.
 */
export interface SearchFilter {
    field: string;
    operator: string;
    value: string | number | boolean | string[] | null;
}

/**
 * Parameters required to search projects (pagination + filters).
 */
export interface ProjectSearchFilters {
    page: number;
    limit: number;
    filters: SearchFilter[]; // Array of filters
}

/**
 * API response for project search.
 */
export interface ProjectSearchResponse {
    search_info: { total: number; page: number; limit: number; };
    projects: Project[];
}

/**
 * Performs a search for projects based on filters and pagination.
 */
export async function searchProjects(params: ProjectSearchFilters): Promise<ProjectSearchResponse> {
    // In Express, req.query corresponds to URL parameters (e.g. ?page=1&limit=10)
    // And req.body corresponds to the JSON array (e.g. [{field: 'title', ...}])
    return http<ProjectSearchResponse>(`/projects/searches?page=${params.page}&limit=${params.limit}`, {
        method: 'POST',
        // The backend expects an array (req.body as any[])
        body: JSON.stringify(params.filters)
    });
}

/**
 * Minimal user representation expected by the backend for privileges
 */
export interface MinimalUserModel {
    user_id: number;
}

/**
 * The exact payload structure expected by POST /projects
 * Copied and adapted from the backend's validation model.
 */
export interface PublicProjectRequestCreationModel {
    root_folder_path: string;
    project_title: string;
    project_acronym: string;
    project_description: string;
    project_information?: string;
    cruise: string;
    ship: string;
    data_owner_name: string;
    data_owner_email: string;
    operator_name: string;
    operator_email: string;
    chief_scientist_name: string;
    chief_scientist_email: string;
    override_depth_offset?: number;
    enable_descent_filter: boolean;
    privacy_duration: number;
    visible_duration: number;
    public_duration: number;
    instrument_model: string;
    serial_number: string;

    // Privilege arrays
    members: MinimalUserModel[];
    managers: MinimalUserModel[];
    contact: MinimalUserModel;

    // EcoTaxa Link
    ecotaxa_project_id: number | null;
    ecotaxa_project_name: string | null;
    ecotaxa_instance_id: number | null;
    new_ecotaxa_project: boolean;
    ecotaxa_account_id: number | null;
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Creates a new project.
 * Endpoint: POST /projects
 * * @param payload The mapped project data
 * @returns The created project response from the server
 */
export async function createProject(payload: PublicProjectRequestCreationModel): Promise<Project> {
    return http<Project>('/projects', {
        method: 'POST',
        // Convert the JavaScript object to a JSON string for the HTTP body
        body: JSON.stringify(payload)
    });
}