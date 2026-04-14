import { Box, Container, Typography, Button, Paper } from "@mui/material";
import MainLayout from "@/app/layouts/MainLayout";
import { useNewProjectForm } from "../hooks/useNewProjectForm";
import Grid from "@mui/material/Grid";

// 1. IMPORT THE SECTIONS
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
    // We extract the state (values) and the setter (updateField) from our Hook
    const { values, updateField, handleSubmit, handleLoadMetadata, availableUsers, isRemoteProject } = useNewProjectForm();

    return (
        <MainLayout>
            <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>

                <Box sx={{ mb: 4, textAlign: "center" }}>
                    <Typography variant="h4" gutterBottom>
                        New project
                    </Typography>
                </Box>

                <Paper sx={{ p: { xs: 3, md: 5 } }}>
                    {/* ROOT FOLDER SECTION (Replaces the old inline code) */}
                    <RootFolderSection 
                        value={values.rootFolderPath} 
                        // Since rootFolderPath is a primitive (string), we pass it directly
                        onChange={(val) => updateField('rootFolderPath', val)} 
                        onLoadMetadata={handleLoadMetadata}
                    />

                    {/* SECTION: Instrument */}
                    <InstrumentMetadataSection
                        values={values.instrument}
                        onChange={(data) => updateField('instrument', data)}
                    />
                    {/* SECTION: Project metadata */}
                    <ProjectMetadataSection
                        values={values.metadata}
                        onChange={(data) => updateField('metadata', data)}
                    />
                    {/* SECTION: Project peoples */}
                    <ProjectPeopleSection
                        values={values.people}
                        onChange={(data) => updateField('people', data)}
                    />

                    {/* MASTER GRID FOR SIDE-BY-SIDE SECTIONS */}
                    <Grid container spacing={4}>
                        {/* SECTION: Import Settings */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ImportSettingsSection
                                values={values.importSettings}
                                onChange={(data) => updateField('importSettings', data)}
                            />
                        </Grid>
                        {/* SECTION: EcoTaxa Link */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <EcoTaxaLinkSection
                                values={values.ecoTaxa}
                                onChange={(data) => updateField('ecoTaxa', data)}
                                projectTitle={values.metadata.title}
                            />
                        </Grid>
                    </Grid>
                    <PrivilegesSection
                        values={values.privileges}
                        availableUsers={availableUsers}
                        // Note: Because privileges is an array, our hook's generic updateField replaces the whole array
                        onChange={(data) => updateField('privileges', data)}
                    />

                    <DataPrivacySection
                        values={values.privacy}
                        onChange={(data) => updateField('privacy', data)}
                    />

                    <DataServerSection
                        values={values.dataServer}
                        onChange={(data) => updateField('dataServer', data)}
                        isRemoteProject={isRemoteProject}
                    />
                    {/* Submit Button */}
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
        </MainLayout>
    );
}