import { useEffect, useMemo } from "react";
import { Box, Container, Typography, Button, Paper, Snackbar, Alert, CircularProgress } from "@mui/material";
import Grid from "@mui/material/Grid";

import { useNewProjectForm } from "../hooks/useNewProjectForm";
import { useProjectFormHandlers } from "../hooks/useProjectFormHandlers";

import { ProjectMetadataSection } from "../components/ProjectMetadataSection";
import { InstrumentMetadataSection } from "../components/InstrumentMetadataSection";
import { ProjectPeopleSection } from "../components/ProjectPeopleSection";
import { ImportSettingsSection } from "../components/ImportSettingsSection";
import { EcoTaxaLinkSection } from "../components/EcoTaxaLinkSection";
import { PrivilegesSection } from "../components/PrivilegesSection";
import { DataPrivacySection } from "../components/DataPrivacySection";
import { RootFolderSection } from "../components/RootFolderSection";

export default function NewProjectPage() {
    const {
        values,
        errors,
        updateField,
        handleSubmit,
        handleLoadMetadata,
        availableUsers,
        currentUser,
        lockedTitlePrefix,
        checkingPeople,
        snackbar,
        closeSnackbar,
        isSubmitting,
        isRedirecting,
    } = useNewProjectForm();

    // One stable `onChange` per section (and one error slice each), so the
    // memoized sections only re-render when their own values or errors change.
    const on = useProjectFormHandlers(updateField);
    const sectionErrors = useMemo(() => ({
        instrument: { model: errors.instrumentModel, serialNumber: errors.instrumentSerialNumber },
        metadata: {
            title: errors.projectTitle,
            acronym: errors.projectAcronym,
            ship: errors.ship,
            cruise: errors.cruise,
            description: errors.projectDescription,
        },
        people: {
            dataOwnerName: errors.dataOwnerName,
            dataOwnerEmail: errors.dataOwnerEmail,
            chiefScientistName: errors.chiefScientistName,
            chiefScientistEmail: errors.chiefScientistEmail,
            operatorName: errors.operatorName,
            operatorEmail: errors.operatorEmail,
        },
        ecoTaxa: { instance: errors.ecoTaxaInstance, account: errors.ecoTaxaAccount, project: errors.ecoTaxaProject },
    }), [errors]);

    // Auto-fill the first privilege row with the logged-in user on component mount
    useEffect(() => {
        // If we have a logged-in user, and the privileges list is currently empty
        if (currentUser && values.privileges.length === 0) {
            updateField("privileges", [
                {
                    userId: currentUser.user_id.toString(),
                    role: "Manager",
                    contact: true,
                },
            ]);
        }
        // We intentionally only want this to run once when currentUser becomes available.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    return (
        <>
            <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
                <Box sx={{ mb: 4, textAlign: "center" }}>
                    <Typography variant="h4" gutterBottom>
                        New project
                    </Typography>
                </Box>

                <Paper sx={{ p: { xs: 3, md: 5 } }}>
                    <RootFolderSection
                        value={values.rootFolderPath}
                        onChange={on.rootFolderPath}
                        onLoadMetadata={handleLoadMetadata}
                        error={errors.rootFolderPath}
                    />

                    <InstrumentMetadataSection
                        values={values.instrument}
                        onChange={on.instrument}
                        errors={sectionErrors.instrument}
                    />

                    <ProjectMetadataSection
                        values={values.metadata}
                        onChange={on.metadata}
                        lockedTitlePrefix={lockedTitlePrefix}
                        errors={sectionErrors.metadata}
                    />

                    <ProjectPeopleSection
                        values={values.people}
                        onChange={on.people}
                        errors={sectionErrors.people}
                        checking={checkingPeople}
                    />

                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ImportSettingsSection
                                values={values.importSettings}
                                onChange={on.importSettings}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <EcoTaxaLinkSection
                                values={values.ecoTaxa}
                                onChange={on.ecoTaxa}
                                projectTitle={values.metadata.title}
                                errors={sectionErrors.ecoTaxa}
                            />
                        </Grid>
                    </Grid>

                    <PrivilegesSection
                        values={values.privileges}
                        availableUsers={availableUsers}
                        onChange={on.privileges}
                        managerError={errors.privilegesManager}
                        contactError={errors.privilegesContact}
                    />

                    <DataPrivacySection
                        values={values.privacy}
                        onChange={on.privacy}
                        privateMonthsError={errors.privateMonths}
                        visibleMonthsError={errors.visibleMonths}
                        publicMonthsError={errors.publicMonths}
                    />

                    <Box sx={{ mt: 6, display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isRedirecting}
                        >
                            CREATE
                        </Button>
                        {(isSubmitting || isRedirecting) && (
                            <CircularProgress size={24} />
                        )}
                    </Box>
                </Paper>
            </Container>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={closeSnackbar}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={closeSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
