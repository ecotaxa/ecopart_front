import React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import type { AlertColor } from "@mui/material";
import { exportProjectBackup, runProjectBackup, getProjectById, getLastBackupDate, getOneTask } from "../api/projects.api";
import { extractErrorMessage } from "@/shared/utils/errorMessage";

/** How often the launched backup task is polled until it finishes. */
const BACKUP_TASK_POLL_MS = 3000;
/** Give up following the task after this long; the TASKS tab still shows its real state. */
const BACKUP_TASK_MAX_POLL_MS = 10 * 60 * 1000;

const isTerminalStatus = (status: string | undefined) => {
    const upper = (status ?? "").toUpperCase();
    return upper === "DONE" || upper === "COMPLETED" || upper === "ERROR" || upper === "FAILED";
};

const isFailedStatus = (status: string | undefined) => {
    const upper = (status ?? "").toUpperCase();
    return upper === "ERROR" || upper === "FAILED";
};

export const useProjectBackupTab = (projectId: number) => {
    // --- 1. LOCAL STATE ---
    const [backupFolderPath, setBackupFolderPath] = useState<string>("Loading path...");
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(true);

    const [exportToFtp, setExportToFtp] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const [skipAlreadyImported, setSkipAlreadyImported] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    // The backup task being followed (null when none is running), so the UI can
    // say "backup #N in progress" instead of pretending it already finished.
    const [runningBackupTaskId, setRunningBackupTaskId] = useState<number | null>(null);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: React.ReactNode; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    // Cancels the in-flight task polling (unmount, project change, new backup).
    const stopTracking = useRef<(() => void) | null>(null);
    useEffect(() => () => stopTracking.current?.(), []);

    // --- 2. LIFECYCLE (Hydration) ---
    useEffect(() => {
        let isMounted = true;

        const loadProjectData = async () => {
            setIsLoadingMetadata(true);

            // The project (path) and the last backup date are independent: load both at once.
            const [projectResult, backupResult] = await Promise.allSettled([
                getProjectById(projectId),
                getLastBackupDate(projectId),
            ]);
            if (!isMounted) return;

            if (projectResult.status === "fulfilled") {
                setBackupFolderPath(projectResult.value.root_folder_path || "No path configured");
            } else {
                console.error("Failed to load project path:", projectResult.reason);
                setBackupFolderPath("Error loading path");
            }

            if (backupResult.status === "fulfilled") {
                setLastBackupDate(backupResult.value?.last_backup_date || null);
            } else {
                console.error("Failed to load last backup date:", backupResult.reason);
                setLastBackupDate(null);
            }

            setIsLoadingMetadata(false);
        };

        loadProjectData();

        return () => {
            isMounted = false;
        };
    }, [projectId]);

    // --- 3. HELPERS ---
    const showSnackbar = useCallback((message: React.ReactNode, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const closeSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const taskLink = useCallback((taskId: number) => (
        <Link to={`/projects/${projectId}/tasks/${taskId}`} style={{ color: "inherit", fontWeight: "bold", textDecoration: "underline" }}>
            #{taskId}
        </Link>
    ), [projectId]);

    /**
     * Follow the launched backup task until it ends, then refresh the last backup
     * date from the server. The date is only ever what the backend reports —
     * never a locally invented timestamp — so a failed or still-running backup
     * can't show up as done.
     */
    const trackBackupTask = useCallback((taskId: number) => {
        stopTracking.current?.();
        let cancelled = false;
        let timer: number | null = null;
        const startedAt = Date.now();
        stopTracking.current = () => {
            cancelled = true;
            if (timer !== null) window.clearTimeout(timer);
        };

        setRunningBackupTaskId(taskId);

        const finish = () => {
            if (cancelled) return;
            setRunningBackupTaskId(null);
            stopTracking.current = null;
        };

        const poll = async () => {
            if (cancelled) return;
            try {
                const task = await getOneTask(taskId);
                if (cancelled) return;

                if (isTerminalStatus(task.task_status)) {
                    if (isFailedStatus(task.task_status)) {
                        showSnackbar(<>Backup task {taskLink(taskId)} failed{task.task_error ? `: ${task.task_error}` : "."}</>, "error");
                    } else {
                        const backupData = await getLastBackupDate(projectId);
                        if (cancelled) return;
                        setLastBackupDate(backupData?.last_backup_date || null);
                        showSnackbar(<>Backup task {taskLink(taskId)} completed.</>, "success");
                    }
                    finish();
                    return;
                }
            } catch (error) {
                // Transient failure (network, refresh…): keep polling until the deadline.
                console.warn(`[Backup] Could not read task ${taskId} status`, error);
            }

            if (Date.now() - startedAt >= BACKUP_TASK_MAX_POLL_MS) {
                finish();
                return;
            }
            timer = window.setTimeout(poll, BACKUP_TASK_POLL_MS);
        };

        timer = window.setTimeout(poll, BACKUP_TASK_POLL_MS);
    }, [projectId, showSnackbar, taskLink]);

    // --- 4. ACTIONS ---
    const handleStartExport = async () => {
        setIsExporting(true);
        try {
            const response = await exportProjectBackup(projectId, {
                ftp_export: exportToFtp,
            });
            showSnackbar(
                <>Export task {taskLink(response.task_id)} started successfully! You can check its progress in the TASKS tab.</>,
                "success"
            );
        } catch (error) {
            console.error("Export failed:", error);
            showSnackbar(extractErrorMessage(error, "Failed to start export."), "error");
        } finally {
            setIsExporting(false);
        }
    };

    const handleStartBackup = async () => {
        setIsBackingUp(true);
        try {
            const response = await runProjectBackup(projectId, {
                skip_already_imported: skipAlreadyImported,
            });

            showSnackbar(
                <>Backup task {taskLink(response.task_id)} started successfully! You can check its progress in the TASKS tab.</>,
                "success"
            );

            trackBackupTask(response.task_id);
        } catch (error) {
            console.error("[Backup] Backup failed:", error);
            showSnackbar(extractErrorMessage(error, "Failed to start backup."), "error");
        } finally {
            setIsBackingUp(false);
        }
    };

    return {
        backupFolderPath,
        lastBackupDate,
        isLoadingMetadata,

        exportToFtp,
        setExportToFtp,
        isExporting,
        handleStartExport,

        skipAlreadyImported,
        setSkipAlreadyImported,
        isBackingUp,
        runningBackupTaskId,
        handleStartBackup,

        snackbar,
        closeSnackbar,
    };
};
