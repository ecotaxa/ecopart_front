import React from "react";
import { Box, Button, Snackbar, Alert, CircularProgress, Paper, Container } from "@mui/material";

// Import our reusable Dumb Components
import { PrivilegesSection } from "./PrivilegesSection";
import { DataPrivacySection } from "./DataPrivacySection";

import { useProjectSecurityTab } from "@/features/projects/hooks/useProjectSecurityTab";
import { useAuthStore } from "@/features/auth/store/auth.store";

interface ProjectSecurityTabProps {
    // The ID of the project we are currently viewing
    projectId: number;
}

/**
 * ProjectSecurityTab Component
 * Displays and allows editing of a project's security metadata (Privacy & Privileges).
 * Structure matches the metadata tab and NewProjectPage exactly.
 */
export const ProjectSecurityTab: React.FC<ProjectSecurityTabProps> = ({ projectId }) => {
    // 1. Connect to the "Brain" (Hook)
    const {
        values,
        loading,
        saving,
        availableUsers,
        updateField,
        handleSave,
        handleCancel,
        snackbar,
        closeSnackbar
    } = useProjectSecurityTab(projectId);

    const currentUser = useAuthStore((state) => state.user);

    // Show a loading spinner while data is being fetched
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    // 2. Render the assembled UI
    // We wrap the Paper in a Container with maxWidth="md" and disable padding
    // so it perfectly matches the width constraints of NewProjectPage!
    return (
        <Container maxWidth="md" disableGutters>
            <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 2, boxShadow: "none" }}>

                {/* Data Privacy Section */}
                <DataPrivacySection
                    values={values.privacy}
                    // We cast the data to Partial<typeof values.privacy> to avoid using 'any'
                    onChange={(data) => updateField('privacy', data as Partial<typeof values.privacy>)}
                />

                <Box sx={{ mt: 6 }}>
                    {/* Privileges Section */}
                    <PrivilegesSection
                        values={values.privileges}
                        availableUsers={availableUsers}
                        currentUserId={currentUser?.user_id ?? null}
                        onChange={(data) => updateField('privileges', data)}
                    />
                </Box>

                {/* Action Buttons (Save / Cancel) */}
                <Box sx={{ mt: 6, pt: 3, display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ minWidth: 120, fontWeight: 'bold' }}
                    >
                        {saving ? "SAVING..." : "SAVE"}
                    </Button>
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={handleCancel}
                        disabled={saving}
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

            </Paper>
        </Container>
    );
};