import { useTasksTable } from "./useTasksTable";

/**
 * Hook backing a project's TASKS tab: the task grid scoped to one project
 * (`task_project_id = projectId`), searching the task label by default.
 * Everything else (search, pagination, delete, download) is `useTasksTable`.
 */
export const useProjectTasksTab = (projectId: number) =>
    useTasksTable(undefined, { projectId, defaultAttribute: "task_type" });
