import React from "react";
import { 
    Box, Typography, Button, Switch, FormControlLabel, 
    TextField, Divider, Paper, Snackbar, Alert, CircularProgress, InputAdornment 
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

import { useProjectBackupTab } from "../hooks/useProjectBackupTab";

interface ProjectBackupTabProps {
    projectId: number;
}

export const ProjectBackupTab: React.FC<ProjectBackupTabProps> = ({ projectId }) => {
    // Connect to our business logic Brain
    const {
        backupFolderPath,
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

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom>
                Backup
            </Typography>
            <Divider sx={{ mb: 4 }} />

            <Paper variant="outlined" sx={{ p: 4, mb: 4 }}>
                {/* --- 1. EXPORT SECTION --- */}
                <Box sx={{ mb: 6 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        Export <Box component="span" fontWeight="normal">of the backuped raw project</Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Zip of the folders raw, meta, and config.
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
                        label={<Typography variant="body1">Export also on FTP</Typography>}
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
                        sx={{ width: 120 }}
                    >
                        {isExporting ? "STARTING..." : "START"}
                    </Button>
                </Box>

                {/* --- 2. BACKUP SECTION --- */}
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                        Backup <Box component="span" fontWeight="normal">of the raw project</Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Last backup done 3 weeks ago
                    </Typography>

                    {/* MENTOR NOTE: Read-only TextField to display the path stored in the DB.
                        It is visually matching the mockup, but disabled to prevent the user
                        from thinking they can change it here. */}
                    <TextField
                        fullWidth
                        label="Backup from root folder path"
                        value={backupFolderPath}
                        disabled // CRITICAL: This makes it read-only
                        sx={{ mb: 3, maxWidth: 600 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    {isLoadingMetadata ? (
                                        <CircularProgress size={20} color="inherit" />
                                    ) : (
                                        // Use a disabled-looking icon since it's not clickable
                                        <FolderOpenIcon color="disabled" />
                                    )}
                                </InputAdornment>
                            ),
                        }}
                    />

                    <FormControlLabel
                        control={
                            <Switch 
                                checked={skipAlreadyImported} 
                                onChange={(e) => setSkipAlreadyImported(e.target.checked)} 
                                color="primary" 
                                disabled={isBackingUp}
                            />
                        }
                        label={<Typography variant="body1">Skip already imported</Typography>}
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
                        sx={{ width: 120 }}
                    >
                        {isBackingUp ? "STARTING..." : "START"}
                    </Button>
                </Box>
            </Paper>

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
        </Box>
    );
};