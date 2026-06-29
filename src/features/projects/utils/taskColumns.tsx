import { Stack, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";

import { isExportTask, Task } from "../api/projects.api";

/**
 * Shared task-grid formatting + columns.
 *
 * Both the global Tasks page (`TasksPage`) and the project-scoped tasks tab
 * (`ProjectTasksTab`) render the same task grid; only the trailing "actions"
 * column differs (it targets a different project id). Keep the formatting and the
 * common columns here so the two views can never drift.
 */

/** Human-readable task owner from the loosely-typed `task_owner` field. */
export const formatTaskOwner = (owner: Task["task_owner"]): string => {
    if (!owner) {
        return "System";
    }

    if (typeof owner === "string") {
        let cleaned = owner
            .replace(/\bundefined\b/gi, "")
            .replace(/\bnull\b/gi, "")
            .replace(/\s+/g, " ")
            .trim();

        if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
            cleaned = cleaned.slice(1, -1).trim();
        }

        return cleaned || "System";
    }

    const ownerObject = owner as Record<string, unknown>;
    const candidateParts = [
        ownerObject.first_name,
        ownerObject.last_name,
        ownerObject.user_name,
    ]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value && value.toLowerCase() !== "undefined" && value.toLowerCase() !== "null");

    if (candidateParts.length > 0) {
        const name = candidateParts.join(" ");
        return ownerObject.email ? `${name} (${ownerObject.email})` : name;
    }

    if (ownerObject.email && typeof ownerObject.email === "string") {
        return ownerObject.email;
    }

    return "System";
};

/** Uppercased status label, falling back to the numeric id then "UNKNOWN". */
export const formatTaskStatus = (task: Task): string => {
    const statusLabel = task.task_status?.trim();
    if (statusLabel) {
        return statusLabel.toUpperCase();
    }

    if (typeof task.task_status_id === "number") {
        return `STATUS ${task.task_status_id}`;
    }

    return "UNKNOWN";
};

/**
 * True when a task exposes a downloadable export archive: it must be an export
 * task AND have finished, since the ZIP only exists once the task is done.
 */
export const isDownloadableTask = (task: Task): boolean => {
    if (!isExportTask(task)) return false;
    const status = formatTaskStatus(task);
    return status === "DONE" || status === "COMPLETED";
};

/** Status cell: an icon (success/error/in-progress) next to the status label. */
export const renderTaskStatusCell = (params: GridRenderCellParams<Task>) => {
    const status = formatTaskStatus(params.row);

    if (status === "DONE" || status === "COMPLETED") {
        return (
            <Stack direction="row" spacing={0.5} alignItems="center">
                <CheckIcon color="success" fontSize="small" />
                <Typography variant="body2">{status}</Typography>
            </Stack>
        );
    }

    if (status === "ERROR" || status === "FAILED") {
        return (
            <Stack direction="row" spacing={0.5} alignItems="center">
                <PriorityHighIcon color="error" fontSize="small" />
                <Typography variant="body2">{status}</Typography>
            </Stack>
        );
    }

    return (
        <Stack direction="row" spacing={0.5} alignItems="center">
            <MoreHorizIcon color="warning" fontSize="small" />
            <Typography variant="body2">{status}</Typography>
        </Stack>
    );
};

/**
 * The columns shared by every task grid (everything except the trailing
 * "actions" column, which each view appends with its own navigation target).
 */
export const buildBaseTaskColumns = (): GridColDef<Task>[] => [
    { field: "task_id", headerName: "Task id", width: 90 },
    { field: "task_type", headerName: "Label", flex: 1, minWidth: 120 },
    {
        field: "task_owner",
        headerName: "Owner",
        flex: 1.5,
        minWidth: 150,
        valueGetter: (_value, row) => formatTaskOwner(row.task_owner),
    },
    {
        field: "task_status",
        headerName: "Status",
        width: 170,
        align: "center",
        headerAlign: "center",
        renderCell: renderTaskStatusCell,
    },
    {
        field: "task_progress_pct",
        headerName: "Progress",
        width: 100,
        align: "center",
        valueGetter: (_value, row) => `${row.task_progress_pct ?? 0}%`,
    },
    {
        field: "task_progress_msg",
        headerName: "Message",
        flex: 2,
        minWidth: 200,
        valueGetter: (_value, row) => row.task_progress_msg ?? "No status report",
    },
    {
        field: "task_creation_utc_date_time",
        headerName: "Creation",
        flex: 1.5,
        minWidth: 150,
        valueGetter: (_value, row) =>
            row.task_creation_utc_date_time ? new Date(row.task_creation_utc_date_time).toLocaleString() : "",
    },
    {
        field: "task_end_utc_date_time",
        headerName: "Last update",
        flex: 1.5,
        minWidth: 150,
        valueGetter: (_value, row) =>
            row.task_end_utc_date_time
                ? new Date(row.task_end_utc_date_time).toLocaleString()
                : row.task_creation_utc_date_time
                    ? new Date(row.task_creation_utc_date_time).toLocaleString()
                    : "",
    },
];
