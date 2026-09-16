import React from "react";
import { Box, Button, Snackbar, Alert, CircularProgress } from "@mui/material";

import SectionCard from "@/shared/components/SectionCard";

// Import our reusable Dumb Components
import { PrivilegesSection } from "./PrivilegesSection";
import { DataPrivacySection } from "./DataPrivacySection";

import { useProjectSecurityTab } from "@/features/projects/hooks/useProjectSecurityTab";

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
        errors,
        loading,
        saving,
        availableUsers,
        updateField,
        handleSave,
        handleCancel,
        snackbar,
        closeSnackbar
    } = useProjectSecurityTab(projectId);

    // Show a loading spinner while data is being fetched
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    // 2. Render the assembled UI in the shared SectionCard (uniform card style
    // and width across all project tabs).
    return (
        <SectionCard>

                {/* Data Privacy Section */}
                <DataPrivacySection
                    values={values.privacy}
                    // We cast the data to Partial<typeof values.privacy> to avoid using 'any'
                    onChange={(data) => updateField('privacy', data as Partial<typeof values.privacy>)}
                    privateMonthsError={errors.privateMonths}
                    visibleMonthsError={errors.visibleMonths}
                    publicMonthsError={errors.publicMonths}
                />

                <Box sx={{ mt: 6 }}>
                    {/* Privileges Section */}
                    <PrivilegesSection
                        values={values.privileges}
                        availableUsers={availableUsers}
                        onChange={(data) => updateField('privileges', data)}
                        managerError={errors.privilegesManager}
                        contactError={errors.privilegesContact}
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

        </SectionCard>
    );
};