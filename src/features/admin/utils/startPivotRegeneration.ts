import { confirmDialog } from "@/shared/confirm/confirm.store";
import type { TaskLaunchResponse } from "@/features/projects/api/projects.api";
import { regenerateAllPivots } from "../api/adminPivots.api";

/**
 * Confirm, then start the forced pivot regeneration of the given projects (every UVP5 project
 * when none is given) as one admin task. Resolves null when the admin cancels; rejects when the
 * task cannot be started. Shared by the QUICK ACCESS and PROJECTS admin tabs.
 */
export async function startPivotRegeneration(projectIds?: number[]): Promise<TaskLaunchResponse | null> {
    const scope = projectIds && projectIds.length > 0
        ? `the samples of the ${projectIds.length} selected project(s) (only the UVP5 ones have a pivot)`
        : "the samples of every UVP5 project";
    const confirmed = await confirmDialog({
        title: "Recompute pivots",
        message: `This rebuilds the particle pivot of ${scope} from their raw UVP5 data, and their particle statistics, in a background task. It can take a long time.`,
        confirmLabel: "Recompute",
        severity: "warning",
    });
    if (!confirmed) return null;
    return regenerateAllPivots({ project_ids: projectIds && projectIds.length > 0 ? projectIds : undefined, force: true });
}

export const pivotTaskStartedMessage = (task: TaskLaunchResponse) =>
    `Pivot regeneration task #${task.task_id} started. You can follow it in the TASKS tab.`;
