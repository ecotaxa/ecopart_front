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


// ============================================================================
// BACKUP & EXPORT API CALLS
// ============================================================================

export interface ExportBackupPayload {
    ftp_export: boolean;
}

export interface RunBackupPayload {
    skip_already_imported: boolean;
}

export interface LastBackupDateResponse {
    last_backup_date: string | null;
}

/**
 * Gets the last backup date for the project.
 * Endpoint: GET /projects/:project_id/backup/last-date
 * 
 * NOTE: cache: 'no-store' forces a fresh fetch from the server, avoiding 304 Not Modified responses.
 */
export async function getLastBackupDate(
    projectId: number
): Promise<LastBackupDateResponse> {
    return http<LastBackupDateResponse>(`/projects/${projectId}/backup/last-date`, {
        method: "GET",
        cache: "no-store",
    });
}

// MENTOR FIX: Nouvelle interface pour capturer la réponse du Backend (Le système de Tâches)
export interface TaskLaunchResponse {
    task_id: number;
    task_status: string;
    task_type: string;
    task_progress_msg?: string;
}

export interface LastBackupDateResponse {
    last_backup_date: string | null;
}

/**
 * Triggers an export of the backuped raw project.
 */
export async function exportProjectBackup(
    projectId: number,
    payload: ExportBackupPayload
): Promise<TaskLaunchResponse> {
    return http<TaskLaunchResponse>(`/projects/${projectId}/backup/export`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/**
 * Triggers a backup of the raw project from a remote folder.
 */
export async function runProjectBackup(
    projectId: number,
    payload: RunBackupPayload
): Promise<TaskLaunchResponse> {
    return http<TaskLaunchResponse>(`/projects/${projectId}/backup`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}


// ============================================================================
// IMPORT SAMPLES API CALLS
// ============================================================================

export interface ImportableRawSample {
    sample_name: string;
    raw_file_name?: string;
    station_id?: string;
    first_image?: number;
    last_image?: number;
    comment?: string;
    qc_lvl1?: boolean;
    qc_lvl1_comment?: string;
}

export interface ImportableEcoTaxaSample {
    sample_id: number;
    sample_name: string;
    tsv_file_name: string;
    local_folder_tsv_path: string;
    images: number;
}

export interface ImportSamplesPayload {
    samples: string[]; // Array of sample_names
    backup_project?: boolean;
    backup_project_skip_already_imported?: boolean;
}

export interface ImportEcoTaxaSamplesPayload {
    samples: string[]; // Array of sample_names
    backup_project?: boolean;
    backup_project_skip_already_imported?: boolean;
    // Add ecotaxa_user if your backend requires it for linking
    ecotaxa_user?: string;
}

/**
 * Endpoint: GET /projects/:project_id/samples/can_be_imported
 */
export async function getImportableRawSamples(projectId: number): Promise<ImportableRawSample[]> {
    return http<ImportableRawSample[]>(`/projects/${projectId}/samples/can_be_imported`, {
        method: "GET",
    });
}

/**
 * Endpoint: POST /projects/:project_id/samples/import
 */
export interface ImportRawSamplesResponse {
    success?: boolean;
    task_import_samples?: number | TaskLaunchResponse;
    task_id?: number;
    task_status?: string;
    task_type?: string;
}

export async function importRawSamples(projectId: number, payload: ImportSamplesPayload): Promise<ImportRawSamplesResponse> {
    return http<ImportRawSamplesResponse>(`/projects/${projectId}/samples/import`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/**
 * Endpoint: GET /projects/:project_id/ecotaxa_samples/can_be_imported
 */
export async function getImportableEcoTaxaSamples(projectId: number): Promise<ImportableEcoTaxaSample[]> {
    return http<ImportableEcoTaxaSample[]>(`/projects/${projectId}/ecotaxa_samples/can_be_imported`, {
        method: "GET",
    });
}

/**
 * Endpoint: POST /projects/:project_id/ecotaxa_samples/import
 */
export async function importEcoTaxaSamples(projectId: number, payload: ImportEcoTaxaSamplesPayload): Promise<{ success: boolean }> {
    return http<{ success: boolean }>(`/projects/${projectId}/ecotaxa_samples/import`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

// ============================================================================
// DATA TAB (SAMPLES) API CALLS
// ============================================================================

export interface SampleData {
    sample_id: number;
    sample_name: string;
    sampling_date?: string;
    filename?: string;
    sample_type_label?: string;
    comment?: string;
    linked_ctd?: boolean;
    visual_qc_status_label?: string;
}

export interface EcoTaxaSampleData {
    sample_id: number;
    sample_name: string;
    ecotaxa_sample_id?: number | null;
    ecotaxa_sample_nb_images?: number;
    classification_progress?: number;
}

//   Align the response interface with the Swagger documentation.
// The backend returns the array under the key "samples", not "items".
export interface SampleSearchResponse {
    search_info: { total: number; page: number; limit: number };
    samples: SampleData[];
}

//  NOTE: Assuming the EcoTaxa search also returns the array under the key "samples".
// If it still doesn't load, check the Swagger for EcoTaxa search and see if the key is "ecotaxa_samples" instead.
export interface EcoTaxaSampleSearchResponse {
    search_info: { total: number; page: number; limit: number };
    samples: EcoTaxaSampleData[];
}

/**
 * Search/List already imported UVP samples for a project.
 * Endpoint: POST /projects/:project_id/samples/searches
 */
export async function searchProjectSamples(projectId: number, params: ProjectSearchFilters): Promise<SampleSearchResponse> {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
    });

    if (params.sort_by) query.set("sort_by", params.sort_by);

    return http<SampleSearchResponse>(`/projects/${projectId}/samples/searches?${query.toString()}`, {
        method: "POST",
        body: JSON.stringify(params.filters ?? []),
    });
}

/**
 * Search/List already imported EcoTaxa samples for a project.
 * Endpoint: POST /projects/:project_id/ecotaxa_samples/searches
 */
export async function searchProjectEcoTaxaSamples(projectId: number, params: ProjectSearchFilters): Promise<EcoTaxaSampleSearchResponse> {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
    });

    if (params.sort_by) query.set("sort_by", params.sort_by);

    return http<EcoTaxaSampleSearchResponse>(`/projects/${projectId}/ecotaxa_samples/searches?${query.toString()}`, {
        method: "POST",
        body: JSON.stringify(params.filters ?? []),
    });
}

/**
 * Delete a single UVP sample.
 * Endpoint: DELETE /projects/:project_id/samples/:sample_id
 */
export async function deleteProjectSample(projectId: number, sampleId: number): Promise<{ message: string }> {
    return http<{ message: string }>(`/projects/${projectId}/samples/${sampleId}`, {
        method: "DELETE",
    });
}

/**
 * Delete multiple EcoTaxa samples.
 * Endpoint: DELETE /projects/:project_id/ecotaxa_samples
 */
export async function deleteProjectEcoTaxaSamples(projectId: number, sampleNames: string[]): Promise<{ message: string }> {
    return http<{ message: string }>(`/projects/${projectId}/ecotaxa_samples`, {
        method: "DELETE",
        body: JSON.stringify({ samples: sampleNames }),
    });
}

// ============================================================================
// CTD SAMPLES API CALLS
// ============================================================================

export interface CtdSampleData {
    sample_name: string;
    ctd_sample_id?: string;
    ctd_import_date?: string;
    station_id?: string;
}

export interface ImportableCtdSample {
    sample_name: string;
    ctd_sample_id?: string;
    file_extension?: string;
    station_id?: string;
}

export interface CtdSampleSearchResponse {
    search_info: { total: number; page: number; limit: number };
    samples: CtdSampleData[];
}

type RawCtdSampleSearchResponse = {
    search_info?: { total?: number; page?: number; limit?: number };
    samples?: CtdSampleData[];
    items?: CtdSampleData[];
    results?: CtdSampleData[];
    rows?: CtdSampleData[];
    data?: CtdSampleData[];
    total?: number;
    page?: number;
    limit?: number;
};

type RawCtdImportableResponse = string[] | ImportableCtdSample[] | {
    samples?: string[] | ImportableCtdSample[];
    items?: string[] | ImportableCtdSample[];
    results?: string[] | ImportableCtdSample[];
    rows?: string[] | ImportableCtdSample[];
    data?: string[] | ImportableCtdSample[];
};

function normalizeCtdSampleSearchResponse(raw: RawCtdSampleSearchResponse): CtdSampleSearchResponse {
    const samples = raw.samples ?? raw.items ?? raw.results ?? raw.rows ?? raw.data ?? [];

    return {
        search_info: {
            total: raw.search_info?.total ?? raw.total ?? samples.length,
            page: raw.search_info?.page ?? raw.page ?? 1,
            limit: raw.search_info?.limit ?? raw.limit ?? (samples.length > 0 ? samples.length : 10),
        },
        samples,
    };
}

function normalizeImportableCtdSamples(raw: RawCtdImportableResponse): ImportableCtdSample[] {
    let rawSamples: (string | ImportableCtdSample)[] = [];
    if (Array.isArray(raw)) {
        rawSamples = raw;
    } else {
        rawSamples = raw?.samples ?? raw?.items ?? raw?.results ?? raw?.rows ?? raw?.data ?? [];
    }

    if (rawSamples.length === 0) {
        return [];
    }

    if (typeof rawSamples[0] === "string") {
        return (rawSamples as string[]).map((sampleName) => ({ sample_name: sampleName, file_extension: "ctd" }));
    }

    return rawSamples as ImportableCtdSample[];
}

/**
 * List imported CTD samples for a project.
 * Endpoint: GET /projects/:project_id/ctd_samples
 */
export async function searchProjectCtdSamples(projectId: number, params: ProjectSearchFilters): Promise<CtdSampleSearchResponse> {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
    });

    if (params.sort_by) query.set("sort_by", params.sort_by);

    const rawResponse = await http<RawCtdSampleSearchResponse>(`/projects/${projectId}/ctd_samples?${query.toString()}`, {
        method: "GET",
    });

    return normalizeCtdSampleSearchResponse(rawResponse);
}

/**
 * List CTD sample names that can be imported for a project.
 * Endpoint: GET /projects/:project_id/ctd_samples/can_be_imported
 */
export async function getImportableCtdSamples(projectId: number): Promise<ImportableCtdSample[]> {
    const rawResponse = await http<RawCtdImportableResponse>(`/projects/${projectId}/ctd_samples/can_be_imported`, {
        method: "GET",
    });

    return normalizeImportableCtdSamples(rawResponse);
}

export interface ImportCtdSamplesPayload {
    samples: string[];
}

/**
 * Import CTD samples for a project.
 * Endpoint: POST /projects/:project_id/ctd_samples/import
 */
export async function importProjectCtdSamples(projectId: number, payload: ImportCtdSamplesPayload): Promise<TaskLaunchResponse> {
    return http<TaskLaunchResponse>(`/projects/${projectId}/ctd_samples/import`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/**
 * Delete imported CTD samples from a project.
 * Endpoint: DELETE /projects/:project_id/ctd_samples
 */
export async function deleteProjectCtdSamples(projectId: number, sampleNames: string[]): Promise<{ message: string }> {
    return http<{ message: string }>(`/projects/${projectId}/ctd_samples`, {
        method: "DELETE",
        body: JSON.stringify({ samples: sampleNames }),
    });
}

// ============================================================================
// TASKS API CALLS (Strict alignment with Backend TaskResponseModel)
// ============================================================================

export interface Task {
    task_id: number;
    task_type_id: number;
    task_type: string;
    task_status_id: number;
    task_status: string;
    task_owner_id: number;
    task_owner: string | {
        user_id?: number;
        user_name?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
    } | null;
    task_project_id?: number | null;
    task_creation_date: string;
    task_start_date?: string | null;
    task_end_date?: string | null;
    task_log_file_path?: string;
    task_progress_pct: number;
    task_progress_msg?: string;
    task_params?: Record<string, unknown>;
    task_result?: string | null;
    task_error?: string | null;
    task_step?: string | null;
}

export interface TaskSearchResponse {
    search_info: {
        total: number;
        limit: number;
        page: number;
        pages?: number;
    };
    tasks: Task[];
}

/**
 * Performs a search for project specific tasks.
 * Uses the dedicated POST /tasks/searches route with body filters.
 */
export async function searchProjectTasks(
    params: ProjectSearchFilters & { projectId?: number }
): Promise<TaskSearchResponse> {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
    });

    if (params.sort_by) {
        query.set("sort_by", params.sort_by);
    }

    const filters = params.projectId === undefined
        ? (params.filters ?? [])
        : [{ field: "task_project_id", operator: "=", value: params.projectId }, ...(params.filters ?? [])];

    // Force strict structure matching the backend filters rules
    return http<TaskSearchResponse>(`/tasks/searches?${query.toString()}`, {
        method: "POST",
        body: JSON.stringify(filters),
    });
}

/**
 * Route: DELETE /tasks/:task_id/
 */
export async function deleteProjectTask(taskId: number): Promise<{ message: string }> {
    return http<{ message: string }>(`/tasks/${taskId}/`, {
        method: "DELETE",
    });
}


// ============================================================================
// TASK DETAILS API EXTENSIONS
// ============================================================================

/**
 * Fetches single task record from the server.
 * Route: GET /tasks/:task_id/
 */
export async function getOneTask(taskId: number): Promise<Task> {
    return http<Task>(`/tasks/${taskId}/`, {
        method: "GET",
    });
}

/**
 * Fetches the plain text server log file content for a specific task.
 * Route: GET /tasks/:task_id/log
 */
export async function getTaskLog(taskId: number): Promise<string> {
    // Note: Since the backend returns plain text/html, our http utility handles text extraction
    return http<string>(`/tasks/${taskId}/log`, {
        method: "GET",
    });
}