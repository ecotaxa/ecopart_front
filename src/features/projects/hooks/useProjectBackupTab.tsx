import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertColor } from "@mui/material";
import { exportProjectBackup, runProjectBackup, getProjectById, getLastBackupDate } from "../api/projects.api";

export const useProjectBackupTab = (projectId: number) => {
    // --- 1. LOCAL STATE ---
    const [backupFolderPath, setBackupFolderPath] = useState<string>("Loading path...");
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(true);

    const [exportToFtp, setExportToFtp] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const [skipAlreadyImported, setSkipAlreadyImported] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: React.ReactNode; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    // --- 2. LIFECYCLE (Hydration) ---
    useEffect(() => {
        let isMounted = true;

        const loadProjectData = async () => {
            setIsLoadingMetadata(true);

            // Fetch 1: Project Details (Path)
            try {
                const projectData = await getProjectById(projectId);
                if (isMounted) {
                    setBackupFolderPath(projectData.root_folder_path || "No path configured");
                }
            } catch (error) {
                console.error("Failed to load project path:", error);
                if (isMounted) setBackupFolderPath("Error loading path");
            }

            // Fetch 2: Last Backup Date
            try {
                const backupData = await getLastBackupDate(projectId);
                if (isMounted) {
                    setLastBackupDate(backupData?.last_backup_date || null);
                }
            } catch (error) {
                console.error("Failed to load last backup date:", error);
                if (isMounted) setLastBackupDate(null);
            }

            if (isMounted) {
                setIsLoadingMetadata(false);
            }
        };

        loadProjectData();

        return () => {
            isMounted = false;
        };
    }, [projectId]);

    // --- 3. HELPERS ---
    const showSnackbar = (message: React.ReactNode, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const extractErrorMessage = (error: unknown, defaultMessage: string): string => {
        if (error instanceof Error && error.message) return error.message;
        if (typeof error === "object" && error !== null && 'errors' in error) {
            const errObj = error as { errors: string[] };
            if (Array.isArray(errObj.errors) && errObj.errors.length > 0) {
                return errObj.errors.join(", ");
            }
        }
        return defaultMessage;
    };

    // --- 4. ACTIONS ---
    const handleStartExport = async () => {
        setIsExporting(true);
        try {
            const response = await exportProjectBackup(projectId, {
                ftp_export: exportToFtp,
            });
            showSnackbar(
                <>Export task <Link to={`/projects/${projectId}/tasks/${response.task_id}`} style={{ color: "inherit", fontWeight: "bold", textDecoration: "underline" }}>#{response.task_id}</Link> started successfully! You can check its progress in the TASKS tab.</>,
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
                <>Backup task <Link to={`/projects/${projectId}/tasks/${response.task_id}`} style={{ color: "inherit", fontWeight: "bold", textDecoration: "underline" }}>#{response.task_id}</Link> started successfully! You can check its progress in the TASKS tab.</>,
                "success"
            );

            // MENTOR FIX: Wait for backend to process the task and update the last_backup_date.
            // Backup tasks can take a while, so we retry multiple times if needed.
            let backupDateUpdated = false;

            // Try up to 3 times with increasing delays
            for (let attempt = 1; attempt <= 3; attempt++) {
                const delay = attempt === 1 ? 2000 : attempt === 2 ? 5000 : 10000;
                await new Promise((resolve) => setTimeout(resolve, delay));

                try {
                    console.log(`[Backup] Attempt ${attempt}/3 to fetch last backup date...`);
                    const backupData = await getLastBackupDate(projectId);
                    console.log(`[Backup] Response received:`, backupData);

                    if (backupData?.last_backup_date) {
                        setLastBackupDate(backupData.last_backup_date);
                        console.log("[Backup] ✓ Successfully updated last backup date:", backupData.last_backup_date);
                        backupDateUpdated = true;
                        break;
                    } else {
                        console.log(`[Backup] Attempt ${attempt}: Server returned null date, retrying...`);
                    }
                } catch (dateError) {
                    console.warn(`[Backup] Attempt ${attempt} failed:`, dateError);
                    // Continue to next attempt
                }
            }

            // If we couldn't get the date from the server, use current timestamp as fallback
            if (!backupDateUpdated) {
                const currentDate = new Date().toISOString();
                setLastBackupDate(currentDate);
                console.log("[Backup] ⚠ Using fallback timestamp:", currentDate);
                showSnackbar("Backup started. Date updated to current time (may differ if task is still processing).", "info");
            }

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
        handleStartBackup,

        snackbar,
        closeSnackbar,
    };
};