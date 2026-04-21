import { useState, useEffect } from "react";
import { AlertColor } from "@mui/material";
import { exportProjectBackup, runProjectBackup, getProjectById } from "../api/projects.api";

export const useProjectBackupTab = (projectId: number) => {
    // --- 1. LOCAL STATE ---
    
    // State to hold the pre-configured project details fetched from the server
    const [backupFolderPath, setBackupFolderPath] = useState<string>("Loading path...");
    const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(true);

    // State for the Export section
    const [exportToFtp, setExportToFtp] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // State for the Backup section
    const [skipAlreadyImported, setSkipAlreadyImported] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);

    // Shared Notification State
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    // --- 2. LIFECYCLE (Hydration) ---
    // Fetch project details on mount so we can display the read-only root folder path
    useEffect(() => {
        let isMounted = true; 

        const fetchProjectDetails = async () => {
            setIsLoadingMetadata(true);
            try {
                const projectData = await getProjectById(projectId);
                if (isMounted) {
                    setBackupFolderPath(projectData.root_folder_path || "No path configured");
                }
            } catch (error) {
                console.error("Failed to fetch project details:", error);
                if (isMounted) {
                    setBackupFolderPath("Error loading path");
                }
            } finally {
                if (isMounted) {
                    setIsLoadingMetadata(false);
                }
            }
        };

        fetchProjectDetails();

        return () => {
            isMounted = false;
        };
    }, [projectId]);

    // --- 3. HELPERS ---

    const showSnackbar = (message: string, severity: AlertColor = "info") => {
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
            await exportProjectBackup(projectId, {
                ftp_export: exportToFtp,
            });
            showSnackbar("Export process started successfully.", "success");
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
            await runProjectBackup(projectId, {
                skip_already_imported: skipAlreadyImported,
            });
            showSnackbar("Backup process started successfully.", "success");
        } catch (error) {
            console.error("Backup failed:", error);
            showSnackbar(extractErrorMessage(error, "Failed to start backup."), "error");
        } finally {
            setIsBackingUp(false);
        }
    };

    return {
        // Metadata State
        backupFolderPath,
        isLoadingMetadata,

        // Export state & actions
        exportToFtp,
        setExportToFtp,
        isExporting,
        handleStartExport,

        // Backup state & actions
        skipAlreadyImported,
        setSkipAlreadyImported,
        isBackingUp,
        handleStartBackup,

        // Notifications
        snackbar,
        closeSnackbar,
    };
};