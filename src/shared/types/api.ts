/**
 * A single condition of a backend `POST /<resource>/searches` request.
 * The body of those endpoints is an array of these; pagination goes in the query string.
 */
export interface SearchFilter {
    field: string;
    operator: string;
    // number[] / string[] carry the values for an `IN` operator (e.g. a set of
    // user ids for the managers / members / granted_users / task_owner_id filters).
    value: string | number | boolean | string[] | number[] | null;
}

/** Pagination block every paginated search response carries. */
export interface SearchInfo {
    total: number;
    page: number;
    limit: number;
    pages?: number;
}
