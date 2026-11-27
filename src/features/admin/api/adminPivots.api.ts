import { http } from "@/shared/api/http";
import type { TaskLaunchResponse } from "@/features/projects/api/projects.api";

/**
 * Rebuild the UVP6 pivot of the samples of UVP5 projects, in one background task that belongs
 * to no project (admin only). No `project_ids` = every UVP5 project; the backend skips the
 * unknown and non-UVP5 ones. `force` also rebuilds the pivots already at the current converter
 * version; each rebuilt pivot gets its particle statistics recomputed.
 * Endpoint: POST /admin/samples/pivots/regenerate
 */
export async function regenerateAllPivots(payload: { project_ids?: number[]; force?: boolean } = {}): Promise<TaskLaunchResponse> {
    return http<TaskLaunchResponse>("/admin/samples/pivots/regenerate", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
