import React from "react";
import {
    Box, Typography, Button, Switch, FormControlLabel,
    TextField, Snackbar, Alert, CircularProgress, InputAdornment
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

import SectionCard from "@/shared/components/SectionCard";
import InfoTooltip from "@/shared/components/InfoTooltip";
import { useProjectBackupTab } from "../hooks/useProjectBackupTab";

interface ProjectBackupTabProps {
    projectId: number;
}

// What gets archived, in user terms (folders and formats, no server internals).
const backupInfoContent = (
    <Box>
        <Typography variant="caption" component="p" sx={{ mb: 1 }}>
            The backup archives the raw acquisition data and its description files, as they
            appear in the project source folder.
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            <li>
                <strong>Raw data ("raw" folder):</strong> each acquisition/profile is compressed
                into a .zip archive.
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    <li>UVP5: one folder per cast (HDR…), archived as .zip.</li>
                    <li>UVP6: one folder per acquisition (timestamped), archived as .zip.</li>
                </Box>
            </li>
            <li>
                <strong>Metadata ("meta" folder):</strong> the instrument header file, kept as-is.
            </li>
            <li>
                <strong>Configuration ("config" folder):</strong> kept as-is.
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    <li>UVP5: cruise info, UVP5 settings, install configuration.</li>
                    <li>UVP6: cruise info, acquisition times, hardware time, vignette computation, timetable.</li>
                </Box>
            </li>
        </Box>
        <Typography variant="caption" component="p" sx={{ mt: 1 }}>
            Raw acquisitions are compressed to .zip; the meta and config files are copied unchanged.
        </Typography>
    </Box>
);

// Effect of the "Skip already imported" toggle (incremental backup).
const skipInfoContent = (
    <Box>
        <Typography variant="caption" component="p" sx={{ mb: 0.5 }}>
            Incremental backup.
        </Typography>
        <Typography variant="caption" component="p" sx={{ mb: 0.5 }}>
            <strong>On:</strong> only raw acquisitions not yet present in the backup are added.
            Metadata and configuration are always refreshed.
        </Typography>
        <Typography variant="caption" component="p">
            <strong>Off:</strong> all raw acquisitions are backed up again.
        </Typography>
    </Box>
);

// Effect of the "Export also on FTP" toggle.
const ftpInfoContent = (
    <Box>
        <Typography variant="caption" component="p" sx={{ mb: 0.5 }}>
            <strong>On:</strong> the export archive is also dropped on the FTP, in addition to the
            download link.
        </Typography>
        <Typography variant="caption" component="p">
            <strong>Off:</strong> only the download link is provided.
        </Typography>
    </Box>
);

export const ProjectBackupTab: React.FC<ProjectBackupTabProps> = ({ projectId }) => {
    // Connect to our business logic Brain
    const {
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
    } = useProjectBackupTab(projectId);

    // MENTOR FIX: Robust date formatter that handles "Invalid Date" objects.
    const formatLastBackupDate = (dateString: string | null): React.ReactNode => {
        // If it's explicitly null or empty, and we aren't loading, it hasn't been backed up.
        if (!dateString) return "The project have never been backuped.";
        
        try {
            const date = new Date(dateString);
            
            // CRITICAL CHECK: In JS, `new Date("garbage")` returns an object, but its time is NaN.
            if (isNaN(date.getTime())) {
                return "The project have never been backuped."; // Or "Invalid date format from server"
            }
            
            const formattedDate = date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            const formattedTime = date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `Last backup done on ${formattedDate} at ${formattedTime}`;
        } catch {
            return "The project have never been backuped.";
        }
    };

    return (
        <>
            <SectionCard>
                {/* --- 1. BACKUP SECTION --- */}
                <Box sx={{ mb: 6 }}>
                    <Typography variant="h6">
                        Backup <Box component="span" fontWeight="normal">of the raw project</Box>
                        <InfoTooltip title={backupInfoContent} />
                    </Typography>

                    {/* MENTOR FIX: Show a loading indicator for the date if we are fetching metadata */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, display: 'flex', alignItems: 'center', minHeight: 24 }}>
                        {isLoadingMetadata ? (
                            <CircularProgress size={16} sx={{ mr: 1, color: 'text.secondary' }} />
                        ) : null}
                        {isLoadingMetadata ? "Checking backup status..." : formatLastBackupDate(lastBackupDate)}
                    </Typography>

                    {/*  NOTE: Read-only TextField to display the path stored in the DB.
                        It is visually matching the mockup, but disabled to prevent the user
                        from thinking they can change it here. */}
                    <Box sx={{ mb: 3, maxWidth: 600 }}>
                         <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5, position: 'relative', top: '10px', backgroundColor: 'white', px: 0.5, zIndex: 1 }}>
                            Backup from root folder path
                        </Typography>
                        <TextField
                            fullWidth
                            value={backupFolderPath}
                            disabled // CRITICAL: This makes it read-only
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        {isLoadingMetadata ? (
                                            <CircularProgress size={20} color="inherit" />
                                        ) : (
                                            <FolderOpenIcon color="disabled" />
                                        )}
                                    </InputAdornment>
                                ),
                            }}
                            size="small"
                            sx={{ '& .Mui-disabled': { WebkitTextFillColor: 'rgba(0, 0, 0, 0.6) !important' } }}
                        />
                    </Box>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={skipAlreadyImported}
                                onChange={(e) => setSkipAlreadyImported(e.target.checked)}
                                color="primary"
                                disabled={isBackingUp}
                            />
                        }
                        label={
                            <Typography variant="body1" component="span">
                                Skip already imported
                                <InfoTooltip title={skipInfoContent} />
                            </Typography>
                        }
                        sx={{ mb: 1, display: 'block' }}
                    />

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mb: 3 }}>
                        Imports all items or only new ones based on this option. Missing samples are not deleted in any case.
                    </Typography>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleStartBackup}
                        disabled={isBackingUp || isLoadingMetadata}
                        sx={{ width: 120, boxShadow: 'none' }}
                    >
                        {isBackingUp ? "STARTING..." : "START"}
                    </Button>
                </Box>

                {/* --- 2. EXPORT SECTION --- */}
                <Box>
                    <Typography variant="h6">
                        Export <Box component="span" fontWeight="normal">of the backed-up raw project</Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Zip of the raw, meta, and config folders.
                    </Typography>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={exportToFtp}
                                onChange={(e) => setExportToFtp(e.target.checked)}
                                color="primary"
                                disabled={isExporting}
                            />
                        }
                        label={
                            <Typography variant="body1" component="span">
                                Export also on FTP
                                <InfoTooltip title={ftpInfoContent} />
                            </Typography>
                        }
                        sx={{ mb: 1 }}
                    />

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mb: 3, maxWidth: 600 }}>
                        In addition to a direct download link available in the task, your export will be located on the FTP in the folder : ecopart_exported_data/task_id/
                        ecopart_backup_export_projid_YYYYMMDD_HHMMSS.zip.
                    </Typography>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleStartExport}
                        disabled={isExporting || isLoadingMetadata}
                        sx={{ width: 120, boxShadow: 'none' }}
                    >
                        {isExporting ? "STARTING..." : "START"}
                    </Button>
                </Box>
            </SectionCard>

            {/* --- GLOBAL NOTIFICATIONS --- */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={closeSnackbar}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};