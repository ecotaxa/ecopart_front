import { http } from "@/shared/api/http";

// ============================================================================
// ADMIN STATISTICS API
// ============================================================================
// Types + fetcher for the admin-only statistics dashboard.
// Backend endpoint: GET /admin/stats (admin only, cookie auth via http()).
//
// The endpoint computes two levels of statistics:
//  - "basic" (fast, pure SQL): counters, breakdowns, count series → always on.
//  - "advanced" (slow, walks every project folder on disk): storage & data
//    size. Only computed when `include_storage=true` is passed, which the UI
//    only triggers on an explicit button click. When it is not requested every
//    *_bytes field comes back `null`.
// ============================================================================

// --- TYPES ---

export type StatsGranularity = "day" | "week" | "month";

export interface LabelCount {
    label: string;
    count: number;
}

export interface OrganisationCount {
    organisation: string;
    users: number;
}

export interface AdminStats {
    generated_at: string; // ISO
    totals: {
        // Current state (independent of the selected period).
        users: {
            total: number;
            admins: number;
            validated_email: number;
            pending_validation: number;
            deleted: number;
            distinct_organisations: number;
        };
        projects: {
            total: number;
            backed_up: number;
            linked_to_ecotaxa: number;
            by_instrument: LabelCount[];
        };
        tasks: {
            total: number;
            exports: number;
            imports: number;
            running: number;
            failed: number;
            by_type: LabelCount[];
            by_status: LabelCount[];
        };
        samples: {
            total: number;
            imported_to_ecotaxa: number;
            by_qc_status: LabelCount[];
        };
        storage: {
            // null until include_storage=true.
            total_size_bytes: number | null;
        };
        top_organisations: OrganisationCount[]; // top 10
    };
    period: {
        // Window [from, to].
        from: string;
        to: string;
        granularity: StatsGranularity;
        new_users: number;
        new_projects: number;
        new_samples: number;
        tasks: {
            total: number;
            exports: number;
            by_type: LabelCount[];
            by_status: LabelCount[];
        };
        baseline: {
            projects: number;
            samples: number;
            data_size_bytes: number | null; // null until include_storage=true
        };
        series: Array<{
            // One point per interval, gaps filled with 0.
            interval: string; // "2026-01" (month) | "2026-01-15" (day) | "2026-03" (week: %Y-%W)
            projects_created: number;
            samples_created: number;
            data_size_bytes: number | null; // null until include_storage=true
            cumulative_projects: number;
            cumulative_samples: number;
            cumulative_data_size_bytes: number | null; // idem
        }>;
    };
}

// --- API FUNCTIONS ---

export interface AdminStatsParams {
    from?: string;
    to?: string;
    granularity?: StatsGranularity;
    include_storage?: boolean;
}

/**
 * Fetches admin statistics from the backend.
 * Endpoint: GET /admin/stats
 *
 * `include_storage` is the only expensive knob: when true the backend walks all
 * project folders on disk to compute storage sizes. It must only be set on an
 * explicit user action, never on load or on filter change.
 */
export async function getAdminStats(params: AdminStatsParams = {}): Promise<AdminStats> {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.granularity) qs.set("granularity", params.granularity);
    if (params.include_storage) qs.set("include_storage", "true");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return http<AdminStats>(`/admin/stats${suffix}`);
}
