import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert, Box, Button, CircularProgress, Container, Snackbar, Tab, Tabs, Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudIcon from "@mui/icons-material/Cloud";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ImageIcon from "@mui/icons-material/Image";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import SectionCard from "@/shared/components/SectionCard";
import { confirmDialog } from "@/shared/confirm/confirm.store";
import { ConfirmWarningMessage } from "@/shared/components/ConfirmWarningMessage";
import { deleteProjectSample, getProjectSample } from "../api/projects.api";
import { useProject } from "../hooks/useProject";
import { SampleContextTab } from "../components/SampleContextTab";
import { SampleMetadataTab } from "../components/SampleMetadataTab";

const TABS = [
    { slug: "context", label: "CONTEXT", icon: <CloudIcon /> },
    { slug: "metadata", label: "METADATA", icon: <AssignmentIcon /> },
    { slug: "instrument", label: "INSTRUMENT", icon: <ImageIcon /> },
    { slug: "quality-checks", label: "QUALITY CHECKS", icon: <CheckCircleIcon /> },
] as const;

// The whole segment must be digits: parseInt alone would read "9abc" as sample 9.
const parseId = (value?: string): number | null =>
    value !== undefined && /^\d+$/.test(value) ? Number(value) : null;

export default function SampleDetailsPage() {
    const { id, sampleId, tabName } = useParams<{ id: string; sampleId: string; tabName?: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const projectId = parseId(id);
    const parsedSampleId = parseId(sampleId);
    const hasValidIds = projectId !== null && parsedSampleId !== null;

    const tabIndex = TABS.findIndex((tab) => tab.slug === tabName);
    const currentTab = tabIndex >= 0 ? tabIndex : 0;

    const { data: project } = useProject(projectId);
    const sampleQueryKey = ["projects", projectId, "samples", parsedSampleId] as const;
    const { data: sample, isLoading, error } = useQuery({
        queryKey: sampleQueryKey,
        queryFn: () => getProjectSample(projectId as number, parsedSampleId as number),
        enabled: hasValidIds,
    });

    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const samplesListPath = `/projects/${projectId}/data`;

    if (!hasValidIds) {
        return (
            <Container sx={{ mt: 4 }}><Alert severity="error">Malformed route identifiers.</Alert></Container>
        );
    }

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        navigate(`/projects/${projectId}/samples/${parsedSampleId}/${TABS[newValue].slug}`);
    };

    const handleDeleteSample = async () => {
        if (!sample) return;
        if (!(await confirmDialog({
            title: `Delete sample "${sample.sample_name}"`,
            message: (
                <ConfirmWarningMessage>
                    This deletes the sample and its imported particle and image data from this project,
                    as well as the associated EcoTaxa sample. This cannot be undone.
                </ConfirmWarningMessage>
            ),
            confirmLabel: "Delete",
        }))) return;

        setIsDeleting(true);
        setDeleteError(null);
        try {
            await deleteProjectSample(projectId, parsedSampleId);
            queryClient.removeQueries({ queryKey: sampleQueryKey });
            navigate(samplesListPath);
        } catch (err) {
            console.error("[Sample Details] Delete failed", err);
            setDeleteError(err instanceof Error ? err.message : "Unknown error while deleting the sample.");
        } finally {
            setIsDeleting(false);
        }
    };

    const renderComingSoonTab = (label: string) => (
        <SectionCard sx={{ textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
                {label} Tab (Coming Soon)
            </Typography>
        </SectionCard>
    );

    return (
        <>
            <Container
                maxWidth={false}
                sx={{ maxWidth: { xs: "100%", md: "900px", lg: "1100px" }, mx: "auto", mt: 4, mb: 8 }}
            >
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(samplesListPath)}
                    sx={{ mb: 2 }}
                    color="inherit"
                    size="small"
                >
                    Back to project
                </Button>

                {isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
                ) : error || !sample ? (
                    <Alert severity="error">
                        Failed to load the sample{error instanceof Error ? ` (${error.message})` : ""}.
                    </Alert>
                ) : (
                    <>
                        <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <Box>
                                <Typography variant="h4" gutterBottom>
                                    Sample name
                                </Typography>
                                <Typography variant="h5" color="text.secondary">
                                    {sample.sample_name}
                                </Typography>
                            </Box>

                            <Button variant="outlined" color="error" onClick={handleDeleteSample} disabled={isDeleting}>
                                {isDeleting ? "DELETING..." : "DELETE"}
                            </Button>
                        </Box>

                        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                            <Tabs value={currentTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                                {TABS.map((tab, index) => (
                                    <Tab key={tab.slug} value={index} icon={tab.icon} iconPosition="start" label={tab.label} />
                                ))}
                            </Tabs>
                        </Box>

                        {currentTab === 0 && <SampleContextTab project={project} sample={sample} />}
                        {currentTab === 1 && (
                            <SampleMetadataTab
                                projectId={projectId}
                                project={project}
                                sample={sample}
                                onSampleUpdated={(updated) => queryClient.setQueryData(sampleQueryKey, updated)}
                            />
                        )}
                        {currentTab === 2 && renderComingSoonTab("Instrument")}
                        {currentTab === 3 && renderComingSoonTab("Quality checks")}
                    </>
                )}
            </Container>

            <Snackbar
                open={deleteError !== null}
                autoHideDuration={6000}
                onClose={() => setDeleteError(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={() => setDeleteError(null)} severity="error" variant="filled" sx={{ width: "100%" }}>
                    Failed to delete the sample: {deleteError}
                </Alert>
            </Snackbar>
        </>
    );
}
