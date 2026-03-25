import React from "react";
import { Box, Typography, Button, Snackbar, Alert, CircularProgress, Divider } from "@mui/material";

// Import all our reusable Dumb Components
import { RootFolderSection } from "./RootFolderSection";
import { InstrumentMetadataSection } from "./InstrumentMetadataSection";
import { ProjectMetadataSection } from "./ProjectMetadataSection";
import { ProjectPeopleSection } from "./ProjectPeopleSection";
import { ImportSettingsSection } from "./ImportSettingsSection";
import { EcoTaxaLinkSection } from "./EcoTaxaLinkSection";
import { DataServerSection } from "./DataServerSection";
import { PrivilegesSection } from "./PrivilegesSection";
import { DataPrivacySection } from "./DataPrivacySection";

import { useProjectMetadataTab } from "../hooks/useProjectMetadataTab";

interface ProjectMetadataTabProps {
    // The ID of the project we are currently viewing
    projectId: number;
}

/**
 * ProjectMetadataTab Component
 * Displays and allows editing of a project's metadata.
 */
export const ProjectMetadataTab: React.FC<ProjectMetadataTabProps> = ({ projectId }) => {
    // 1. Connect to the "Brain" (Hook)
    const {
        values,
        loading,
        updateField,
        handleSave,
        handleCancel,
        availableUsers,
        isRemoteProject,
        snackbar,
        closeSnackbar
    } = useProjectMetadataTab(projectId);

    // Show a loading spinner while data is being fetched
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    // 2. Render the assembled UI
    return (
        <Box sx={{ maxWidth: 1000, margin: '0 auto', p: { xs: 2, md: 4 } }}>
            
            {/* The top part of the mockup is likely handled by a parent component (Tabs, Title). 
                We start directly at the "Metadata" form content. */}

            <RootFolderSection 
                value={values.rootFolderPath} 
                onChange={(val) => updateField('rootFolderPath', val)} 
                onLoadMetadata={() => { /* Implement if needed in edit mode */ }}
            />

            <InstrumentMetadataSection 
                values={values.instrument} 
                onChange={(data) => updateField('instrument', data)} 
            />

            <ProjectMetadataSection 
                values={values.metadata} 
                onChange={(data) => updateField('metadata', data)} 
            />

            <ProjectPeopleSection 
                values={values.people} 
                onChange={(data) => updateField('people', data)} 
            />

            <ImportSettingsSection 
                values={values.importSettings} 
                onChange={(data) => updateField('importSettings', data)} 
            />

            <EcoTaxaLinkSection 
                values={values.ecoTaxa} 
                onChange={(data) => updateField('ecoTaxa', data)} 
                projectTitle={values.metadata.title}
            />

            <DataPrivacySection 
                values={values.privacy} 
                onChange={(data) => updateField('privacy', data)} 
            />

            {/* Note: The mockup shows "Data privacy" before "Connexion to data server" */}
            <DataServerSection 
                values={values.dataServer} 
                onChange={(data) => updateField('dataServer', data)} 
                isRemoteProject={isRemoteProject} 
            />

            {/* Action Buttons (Save / Cancel) matching the bottom of the mockup */}
            <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 2 }}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSave}
                    sx={{ minWidth: 120, fontWeight: 'bold' }}
                >
                    SAVE
                </Button>
                <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={handleCancel}
                    sx={{ minWidth: 120, fontWeight: 'bold' }}
                >
                    CANCEL
                </Button>
            </Box>

            {/* Shared Notification System */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={closeSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

        </Box>
    );
};