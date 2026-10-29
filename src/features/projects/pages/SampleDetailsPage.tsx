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

import { confirmDialog } from "@/shared/confirm/confirm.store";
import { isAccessDenied, isNotFound } from "@/shared/api/http";
import { ConfirmWarningMessage } from "@/shared/components/ConfirmWarningMessage";
import { deleteProjectSample, getProjectSample, isTaskCancelled, isTaskDone, waitForTask } from "../api/projects.api";
import { useProject } from "../hooks/useProject";
import { useProjectAccess } from "../hooks/useProjectAccess";
import { ProjectLoadError, ProjectPrivacyNotice } from "../components/ProjectAccessStates";
import { SampleContextTab } from "../components/SampleContextTab";
import { SampleMetadataTab } from "../components/SampleMetadataTab";
import { SampleInstrumentTab } from "../components/SampleInstrumentTab";
import { SampleQualityChecksTab } from "../components/SampleQualityChecksTab";
import { pageBackButtonSx, pageContainerSx, pageHeaderSx, pageTabsSx } from "@/shared/layout/pageLayout";

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

    const { data: project, error: projectError, isPending: isProjectPending } = useProject(projectId);
    const access = useProjectAccess(project);
    // The sample is only asked for once the project says it may be seen: a user who
    // may not see its samples gets the privacy notice instead of a refused request.
    // Coming from the project page, the project is already cached.
    const isHiddenByPrivacy = project !== undefined && !access.can.figures;
    const sampleQueryKey = ["projects", projectId, "samples", parsedSampleId] as const;
    const { data: sample, isLoading, error } = useQuery({
        queryKey: sampleQueryKey,
        queryFn: () => getProjectSample(projectId as number, parsedSampleId as number),
        enabled: hasValidIds && project !== undefined && access.can.figures,
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
            // The deletion runs as a task: the sample exists until it is DONE, so the page waits for it.
            const task = await deleteProjectSample(projectId, parsedSampleId);
            const finished = await waitForTask(task.task_id);
            if (isTaskDone(finished.task_status)) {
                queryClient.removeQueries({ queryKey: sampleQueryKey });
                navigate(samplesListPath);
                return;
            }
            setDeleteError(isTaskCancelled(finished.task_status)
                ? `deletion task #${task.task_id} was cancelled, the sample is kept.`
                : (finished.task_error || `deletion task #${task.task_id} failed.`));
        } catch (err) {
            console.error("[Sample Details] Delete failed", err);
            setDeleteError(err instanceof Error ? err.message : "Unknown error while deleting the sample.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Container
                maxWidth={false}
                // At least 17% of the screen free on each side from tablets up; capped so very wide
                // screens get even more. Phones keep the default gutter, 66% of them would be unreadable.
                sx={{ width: { xs: "100%", md: "66%" }, maxWidth: { md: "1100px" }, mx: "auto", ...pageContainerSx }}
            >
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(samplesListPath)}
                    sx={pageBackButtonSx}
                    color="inherit"
                    size="small"
                >
                    Back to project
                </Button>

                {projectError ? (
                    <ProjectLoadError error={projectError} />
                ) : isHiddenByPrivacy ? (
                    <ProjectPrivacyNotice project={project} />
                ) : isLoading || isProjectPending ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
                ) : isNotFound(error) ? (
                    <Alert severity="warning">This sample does not exist or has been deleted.</Alert>
                ) : isAccessDenied(error) ? (
                    <Alert severity="error">Your account is not allowed to see this sample.</Alert>
                ) : error || !sample ? (
                    <Alert severity="error">
                        Failed to load the sample{error instanceof Error ? ` (${error.message})` : ""}.
                    </Alert>
                ) : (
                    <>
                        <Box sx={{ ...pageHeaderSx, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <Typography variant="h4" sx={{ wordBreak: "break-word" }}>
                                Sample name:{" "}
                                <Box component="span" sx={{ color: "text.secondary" }}>{sample.sample_name}</Box>
                            </Typography>

                            {access.can.manage && (
                                <Button variant="outlined" color="error" onClick={handleDeleteSample} disabled={isDeleting}>
                                    {isDeleting ? "DELETING..." : "DELETE"}
                                </Button>
                            )}
                        </Box>

                        <Box sx={pageTabsSx}>
                            <Tabs value={currentTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                                {TABS.map((tab, index) => (
                                    <Tab key={tab.slug} value={index} icon={tab.icon} iconPosition="start" label={tab.label} />
                                ))}
                            </Tabs>
                        </Box>

                        {currentTab === 0 && <SampleContextTab project={project} sample={sample} canOpenTasks={access.can.import} />}
                        {currentTab === 1 && (
                            <SampleMetadataTab
                                projectId={projectId}
                                project={project}
                                sample={sample}
                                onSampleUpdated={(updated) => queryClient.setQueryData(sampleQueryKey, updated)}
                                readOnly={!access.can.import}
                            />
                        )}
                        {currentTab === 2 && <SampleInstrumentTab sample={sample} />}
                        {currentTab === 3 && (
                            <SampleQualityChecksTab
                                projectId={projectId}
                                sample={sample}
                                onSampleUpdated={(updated) => queryClient.setQueryData(sampleQueryKey, updated)}
                                canValidateQc={access.can.import}
                                canSeeEcoTaxaStats={access.can.import}
                            />
                        )}
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
