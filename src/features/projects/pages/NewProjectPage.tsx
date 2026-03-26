import { useEffect } from "react";
import { Box, Container, Typography, Button, Paper, Snackbar, Alert } from "@mui/material";
import Grid from "@mui/material/Grid";

import MainLayout from "@/app/layouts/MainLayout";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useNewProjectForm } from "../hooks/useNewProjectForm";

import { ProjectMetadataSection } from "../components/ProjectMetadataSection";
import { InstrumentMetadataSection } from "../components/InstrumentMetadataSection";
import { ProjectPeopleSection } from "../components/ProjectPeopleSection";
import { ImportSettingsSection } from "../components/ImportSettingsSection";
import { EcoTaxaLinkSection } from "../components/EcoTaxaLinkSection";
import { PrivilegesSection } from "../components/PrivilegesSection";
import { DataPrivacySection } from "../components/DataPrivacySection";
import { DataServerSection } from "../components/DataServerSection";
import { RootFolderSection } from "../components/RootFolderSection";

export default function NewProjectPage() {
    const {
        values,
        errors,
        updateField,
        handleSubmit,
        handleLoadMetadata,
        availableUsers,
        isRemoteProject,
        snackbar,
        closeSnackbar,
    } = useNewProjectForm();

    const currentUser = useAuthStore((state) => state.user);

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
        <MainLayout>
            <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
                <Box sx={{ mb: 4, textAlign: "center" }}>
                    <Typography variant="h4" gutterBottom>
                        New project
                    </Typography>
                </Box>

                <Paper sx={{ p: { xs: 3, md: 5 } }}>
                    <RootFolderSection
                        value={values.rootFolderPath}
                        onChange={(value) => updateField("rootFolderPath", value)}
                        onLoadMetadata={handleLoadMetadata}
                        error={errors.rootFolderPath}
                    />

                    <InstrumentMetadataSection
                        values={values.instrument}
                        onChange={(data) => updateField("instrument", data)}
                        errors={{
                            model: errors.instrumentModel,
                            serialNumber: errors.instrumentSerialNumber,
                        }}
                    />

                    <ProjectMetadataSection
                        values={values.metadata}
                        onChange={(data) => updateField("metadata", data)}
                        errors={{
                            title: errors.projectTitle,
                            acronym: errors.projectAcronym,
                            ship: errors.ship,
                            cruise: errors.cruise,
                            description: errors.projectDescription,
                        }}
                    />

                    <ProjectPeopleSection
                        values={values.people}
                        onChange={(data) => updateField("people", data)}
                        errors={{
                            dataOwnerName: errors.dataOwnerName,
                            dataOwnerEmail: errors.dataOwnerEmail,
                            chiefScientistName: errors.chiefScientistName,
                            chiefScientistEmail: errors.chiefScientistEmail,
                            operatorName: errors.operatorName,
                            operatorEmail: errors.operatorEmail,
                        }}
                    />

                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ImportSettingsSection
                                values={values.importSettings}
                                onChange={(data) => updateField("importSettings", data)}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <EcoTaxaLinkSection
                                values={values.ecoTaxa}
                                onChange={(data) => updateField("ecoTaxa", data)}
                                projectTitle={values.metadata.title}
                                errors={{
                                    instance: errors.ecoTaxaInstance,
                                    account: errors.ecoTaxaAccount,
                                    project: errors.ecoTaxaProject,
                                }}
                            />
                        </Grid>
                    </Grid>

                    <PrivilegesSection
                        values={values.privileges}
                        availableUsers={availableUsers}
                        currentUserId={currentUser?.user_id ?? null}
                        onChange={(data) => updateField("privileges", data)}
                        managerError={errors.privilegesManager}
                        contactError={errors.privilegesContact}
                    />

                    <DataPrivacySection
                        values={values.privacy}
                        onChange={(data) => updateField("privacy", data)}
                        privateMonthsError={errors.privateMonths}
                        visibleMonthsError={errors.visibleMonths}
                        publicMonthsError={errors.publicMonths}
                    />

                    <DataServerSection
                        values={values.dataServer}
                        onChange={(data) => updateField("dataServer", data)}
                        isRemoteProject={isRemoteProject}
                    />

                    <Box sx={{ mt: 6, display: "flex", justifyContent: "flex-start" }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleSubmit}
                        >
                            CREATE
                        </Button>
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
        </MainLayout>
    );
}