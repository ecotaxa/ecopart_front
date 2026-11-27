import type { ServerFields } from "@/shared/hooks/useServerGridModels";

/**
 * What the project search can sort and filter on, per column of the project
 * grids. Not listed: the privilege, privacy and QC state (computed per project,
 * filtered from their own menus), the managers and members. The instrument is
 * filtered on its name but not sorted: the backend would sort on its id.
 */
const PROJECT_FIELDS: ServerFields = {
    project_id: { sort: "project_id", filter: "project_id", type: "number" },
    project_title: { sort: "project_title", filter: "project_title" },
    instrument_model: { filter: "instrument_model" },
    ecotaxa_project_name: { sort: "ecotaxa_project_name", filter: "ecotaxa_project_name" },
    root_folder_path: { sort: "root_folder_path", filter: "root_folder_path" },
    nbr_sample: { sort: "nbr_sample", filter: "nbr_sample", type: "number" },
    nbr_ctd_sample: { sort: "nbr_ctd_sample", filter: "nbr_ctd_sample", type: "number" },
};

/** The same without the import folder, which the backend only lets an admin sort or filter on. */
const USER_PROJECT_FIELDS: ServerFields = Object.fromEntries(
    Object.entries(PROJECT_FIELDS).filter(([field]) => field !== "root_folder_path"),
);

export const projectServerFields = (isAdmin: boolean): ServerFields =>
    isAdmin ? PROJECT_FIELDS : USER_PROJECT_FIELDS;

/** Newest projects first, also the tie-breaker of a column sort. */
export const PROJECTS_DEFAULT_SORT = "desc(project_id)";
