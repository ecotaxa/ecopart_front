import { http } from "@/shared/api/http";

/**
 * Minimal user representation returned inside project privileges.
 * The backend currently returns at least user_id, and may also include user_name / email.
 */
export interface MinimalUserModel {
    user_id: number;
    user_name?: string;
    email?: string;
}

export interface Project {
    project_id: number;
    project_title: string;
    project_acronym: string;
    instrument_model: string;
    ecotaxa_project_name: string | null;
    root_folder_path: string;

    // Note: The following fields exist in the mockup but are NOT currently returned by the backend.
    // They are marked as optional so TypeScript doesn't complain when mapping the backend response.
    nbr_sample?: number;

    /**
     * IMPORTANT:
     * `privilege` is NOT returned directly by the backend.
     * We keep it optional only because the UI may derive and inject it later if needed.
     */
    privilege?: string;

    qc_state?: string;
    serial_number?: string;
    ship?: string;
    cruise?: string;
    project_description?: string;
    data_owner_name?: string;
    data_owner_email?: string;
    chief_scientist_name?: string;
    chief_scientist_email?: string;
    operator_name?: string;
    operator_email?: string;
    override_depth_offset?: number;
    enable_descent_filter?: boolean;
    ecotaxa_instance_id?: number | null;
    ecotaxa_project_id?: number | null;
    privacy_duration?: number;
    visible_duration?: number;
    public_duration?: number;

    /**
     * The backend public project model returns privileges through these fields,
     * not through a flat `privilege` string.
     */
    members?: MinimalUserModel[];
    managers?: MinimalUserModel[];
    contact?: MinimalUserModel;
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
    filters: SearchFilter[];
    sort_by?: string;
}

/**
 * Normalized frontend response used everywhere in the UI.
 */
export interface ProjectSearchResponse {
    search_info: {
        total: number;
        page: number;
        limit: number;
    };
    projects: Project[];
}

/**
 * Raw backend response can differ depending on backend implementation.
 * We intentionally keep this flexible and normalize it afterwards.
 */
type RawProjectSearchResponse = {
    search_info?: {
        total?: number;
        page?: number;
        limit?: number;
    };
    projects?: Project[];
    results?: Project[];
    rows?: Project[];
    data?: Project[];
    total?: number;
    page?: number;
    limit?: number;
};

/**
 * Normalize any backend response shape into one stable frontend contract.
 * This prevents the page and hook from depending on backend-specific structures.
 */
function normalizeProjectSearchResponse(
    raw: RawProjectSearchResponse
): ProjectSearchResponse {
    const projects =
        raw.projects ??
        raw.results ??
        raw.rows ??
        raw.data ??
        [];

    const total =
        raw.search_info?.total ??
        raw.total ??
        projects.length;

    const page =
        raw.search_info?.page ??
        raw.page ??
        1;

    // We default to 10 if no limit is provided by the backend to keep pagination mathematically sound.
    const limit =
        raw.search_info?.limit ??
        raw.limit ??
        (projects.length > 0 ? projects.length : 10);

    return {
        search_info: {
            total,
            page,
            limit,
        },
        projects,
    };
}

/**
 * Performs a search for projects based on filters and pagination.
 */
export async function searchProjects(
    params: ProjectSearchFilters
): Promise<ProjectSearchResponse> {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
    });

    if (params.sort_by) {
        query.set("sort_by", params.sort_by);
    }

    // In Express, req.query corresponds to URL parameters (?page=1&limit=10)
    // And req.body corresponds to the JSON array of filters.
    const rawResponse = await http<RawProjectSearchResponse>(
        `/projects/searches?${query.toString()}`,
        {
            method: "POST",
            body: JSON.stringify(params.filters ?? []),
        }
    );

    return normalizeProjectSearchResponse(rawResponse);
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

/**
 * Payload expected by PATCH /projects/:id
 */
export interface PublicProjectUpdateModel {
    root_folder_path?: string;
    project_title?: string;
    project_acronym?: string;
    project_description?: string;
    project_information?: string;
    cruise?: string;
    ship?: string;
    data_owner_name?: string;
    data_owner_email?: string;
    operator_name?: string;
    operator_email?: string;
    chief_scientist_name?: string;
    chief_scientist_email?: string;
    override_depth_offset?: number;
    enable_descent_filter?: boolean;
    privacy_duration?: number;
    visible_duration?: number;
    public_duration?: number;
    instrument_model?: string;
    serial_number?: string;

    // If privileges are updated, backend expects full arrays again
    members?: MinimalUserModel[];
    managers?: MinimalUserModel[];
    contact?: MinimalUserModel;

    ecotaxa_project_id?: number | null;
    ecotaxa_instance_id?: number | null;
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Creates a new project.
 * Endpoint: POST /projects
 */
export async function createProject(
    payload: PublicProjectRequestCreationModel
): Promise<Project> {
    return http<Project>("/projects", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/**
 * Fetches a single project by ID using the search endpoint logic.
 * Endpoint: POST /projects/searches
 */
export async function getProjectById(
    projectId: number
): Promise<Project> {
    const response = await searchProjects({
        page: 1,
        limit: 1,
        filters: [{ field: "project_id", operator: "=", value: projectId }],
    });

    if (response.projects.length > 0) {
        return response.projects[0];
    }

    throw new Error(`Project with ID ${projectId} not found.`);
}

/**
 * Updates an existing project.
 * Endpoint: PATCH /projects/:id
 */
export async function updateProject(
    projectId: number,
    payload: PublicProjectUpdateModel
): Promise<Project> {
    return http<Project>(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}


// ============================================================================
// FILE SYSTEM API CALLS
// ============================================================================

export interface ImportFolderMetadataResponse {
    project_acronym: string;
    project_description: string;
    cruise: string;
    ship: string;
    serial_number: string;
    instrument_model: string;
    data_owner?: { name: string; email: string; ecopart_user_id?: number | null };
    operator?: { name: string; email: string; ecopart_user_id?: number | null };
    chief_scientist?: { name: string; email: string; ecopart_user_id?: number | null };
}

/**
 * Endpoint: GET /file_system/import_folders
 */
export async function getImportFolders(folderPath?: string): Promise<string[]> {
    // We trim the path and URL-encode it for safe transmission
    const url = folderPath
        ? `/file_system/import_folders?folder_path=${encodeURIComponent(folderPath.trim())}`
        : "/file_system/import_folders";

    return http<string[]>(url, {
        method: "GET",
    });
}

/**
 * Endpoint: GET /file_system/import_folder_metadata?folder_path=...
 */
export async function getImportFolderMetadata(folderPath: string): Promise<ImportFolderMetadataResponse> {
    // We trim the path and URL-encode it for safe transmission
    const params = new URLSearchParams({ folder_path: folderPath.trim() });

    return http<ImportFolderMetadataResponse>(`/file_system/import_folder_metadata?${params.toString()}`, {
        method: "GET",
    });
}