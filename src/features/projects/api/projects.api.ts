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

export interface ProjectSearchFilters {
    page: number;
    limit: number;
    search_text?: string;
    status_filter?: string; 
}

export interface ProjectSearchResponse {
    search_info: { total: number; page: number; limit: number; };
    projects: Project[];
}

export async function searchProjects(filters: ProjectSearchFilters): Promise<ProjectSearchResponse> {
    return http<ProjectSearchResponse>('/projects/searches', {
        method: 'POST',
        body: JSON.stringify(filters)
    });
}