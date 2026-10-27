import React, { useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Container,
    Typography,
    Button,
    Snackbar,
    Stack,
    Tabs,
    Tab,
    Tooltip,
} from "@mui/material";
import SectionCard from "@/shared/components/SectionCard";
import PrivacyStatusInfo from "@/shared/components/PrivacyStatusInfo";

// Import your tabs
import { ProjectMetadataTab } from "../components/ProjectMetadataTab";
import { ProjectSecurityTab } from "../components/ProjectSecurityTab";

import { ProjectBackupTab } from "../components/ProjectBackupTab";
import { ProjectImportTab } from "../components/ProjectImportTab";
import { ProjectTasksTab } from "../components/ProjectTasksTab";
import { ProjectStatsTab } from "../components/ProjectStatsTab";
import { deleteProject } from "../api/projects.api";
import { useProject } from "../hooks/useProject";
import { useProjectAccess } from "../hooks/useProjectAccess";
import { privacyLabel, type ProjectAction } from "../utils/projectAccess";
import { ProjectLoadError, ProjectPrivacyNotice } from "../components/ProjectAccessStates";
import { confirmDialog } from "@/shared/confirm/confirm.store";
import { ConfirmWarningMessage } from "@/shared/components/ConfirmWarningMessage";

// Icons based on your mockup
import BarChartIcon from "@mui/icons-material/BarChart";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import CloudIcon from "@mui/icons-material/Cloud";
import DownloadIcon from "@mui/icons-material/Download";
import SyncIcon from "@mui/icons-material/Sync";
import LockIcon from "@mui/icons-material/Lock";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BackupIcon from "@mui/icons-material/Backup";
import { ProjectDataTab } from "../components/ProjectDataTab";
import { pageContainerSx, pageHeaderSx, pageTabsSx } from "@/shared/layout/pageLayout";

/** Every tab, in display order, with the action that unlocks it. */
const TAB_DEFINITIONS: ReadonlyArray<{ slug: string; label: string; icon: React.ReactElement; requires: ProjectAction }> = [
    { slug: "stats", label: "STATS", icon: <BarChartIcon />, requires: "see" },
    { slug: "metadata", label: "METADATA", icon: <TextSnippetIcon />, requires: "see" },
    { slug: "data", label: "DATA", icon: <CloudIcon />, requires: "figures" },
    { slug: "import", label: "IMPORT", icon: <DownloadIcon />, requires: "import" },
    { slug: "update", label: "UPDATE", icon: <SyncIcon />, requires: "import" },
    { slug: "security", label: "SECURITY", icon: <LockIcon />, requires: "manage" },
    { slug: "tasks", label: "TASKS", icon: <AssignmentIcon />, requires: "import" },
    { slug: "backup", label: "BACKUP", icon: <BackupIcon />, requires: "import" },
];

const DEFAULT_TAB = "metadata";

/** The tab asked for through `location.state.activeTab`: a slug, or (legacy) an index in TAB_DEFINITIONS. */
const slugFromNavigationState = (state: unknown): string | undefined => {
    const activeTab = (state as { activeTab?: unknown } | null)?.activeTab;
    if (typeof activeTab === "string") return activeTab;
    if (typeof activeTab === "number" && Number.isInteger(activeTab)) return TAB_DEFINITIONS[activeTab]?.slug;
    return undefined;
};

export default function ProjectDetailsPage() {
    const { id, tabName } = useParams<{ id: string; tabName?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Parse the route param once.
    // If parsing fails, we keep null so TypeScript and runtime are both explicit.
    const parsedProjectId = id ? Number.parseInt(id, 10) : null;
    const projectId = parsedProjectId !== null && !Number.isNaN(parsedProjectId) ? parsedProjectId : null;

    // The project itself comes from the shared React Query cache: the tabs below
    // read the same entry, so the page and its active tab cost one request.
    const { data: project, error: projectError, isPending: isProjectPending } = useProject(projectId);
    const access = useProjectAccess(project);
    const projectTitle = project?.project_title?.trim() ? project.project_title : "Project Details";
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Tabs are addressed by slug, so hiding one never shifts the others. A tab the
    // user may not open (deep link, stale navigation state) falls back to METADATA.
    const visibleTabs = TAB_DEFINITIONS.filter((tab) => access.can[tab.requires]);
    const requestedTab = tabName ?? slugFromNavigationState(location.state) ?? DEFAULT_TAB;
    const currentTab = visibleTabs.some((tab) => tab.slug === requestedTab) ? requestedTab : DEFAULT_TAB;

    if (projectId === null) {
        return (
            <Container sx={{ mt: 4 }}>
                <Typography variant="h4" color="error">
                    Invalid Project ID
                </Typography>
            </Container>
        );
    }

    if (projectError) {
        return (
            <Container maxWidth="md" sx={pageContainerSx}>
                <Stack spacing={3} alignItems="flex-start">
                    <ProjectLoadError error={projectError} />
                    <Button variant="outlined" onClick={() => navigate("/projects")}>
                        BACK TO PROJECTS
                    </Button>
                </Stack>
            </Container>
        );
    }

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        navigate(`/projects/${projectId}/${newValue}`);
    };

    // Shown to a user without privilege while the project is private.
    const hiddenDataNotice = project && !access.can.figures ? <ProjectPrivacyNotice project={project} /> : undefined;

    const handleDeleteProject = async () => {
        if (!(await confirmDialog({
            title: `Delete "${projectTitle}"`,
            message: (
                <ConfirmWarningMessage>
                    This also deletes its samples and any linked EcoTaxa project. This cannot be undone.
                </ConfirmWarningMessage>
            ),
            confirmLabel: "Delete",
        }))) return;

        setIsDeleting(true);
        setDeleteError(null);
        try {
            await deleteProject(projectId);
            navigate("/projects");
        } catch (err) {
            console.error("[Project Details] Delete failed", err);
            setDeleteError(err instanceof Error ? err.message : "Unknown error while deleting the project.");
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
            {/* The main container is "lg" to allow future data tables to be wide */}
            <Container
                maxWidth={false} // Disable default width breakpoints
                sx={{
                    maxWidth: {
                        xs: '100%',
                        md: '900px',
                        lg: '1100px' // Your value between md and lg
                    },
                    mx: 'auto', // Center the container when maxWidth is false
                    ...pageContainerSx,
                }}
            >

                {/* TOP HEADER SECTION (Matches Mockup) */}
                <Box sx={{ ...pageHeaderSx, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            Project
                        </Typography>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                            <Typography variant="h5" color="text.secondary">
                                {projectTitle}
                            </Typography>
                            {project && (
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Tooltip title="Privacy status: who can see the project data">
                                        <Chip label={privacyLabel(access.privacy)} size="small" variant="outlined" />
                                    </Tooltip>
                                    <PrivacyStatusInfo />
                                </Box>
                            )}
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={2} alignItems="center">
                        {access.can.manage && (
                            <Tooltip title="Permanently delete this project, its samples and any linked EcoTaxa project">
                                <span>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleDeleteProject}
                                        disabled={isDeleting}
                                    >
                                        DELETE
                                    </Button>
                                </span>
                            </Tooltip>
                        )}

                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => navigate(`/explore?projects=${projectId}`)}
                        >
                            EXPLORE
                        </Button>
                    </Stack>
                </Box>

                {isProjectPending ? (
                    // The tabs depend on the user's access to the project: none until it is known.
                    <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
                        <CircularProgress aria-label="Loading project" />
                    </Box>
                ) : (
                    <>
                        {/* TABS NAVIGATION */}
                        <Box sx={pageTabsSx}>
                            <Tabs
                                value={currentTab}
                                onChange={handleTabChange}
                                variant="scrollable"
                                scrollButtons="auto"
                            >
                                {visibleTabs.map((tab) => (
                                    <Tab key={tab.slug} value={tab.slug} icon={tab.icon} iconPosition="start" label={tab.label} />
                                ))}
                            </Tabs>
                        </Box>

                        {/* TAB CONTENT RENDERER */}
                        {/* We removed the <Paper> wrapper here because ProjectMetadataTab handles its own <Paper> and constraints */}
                        <Box sx={{ minHeight: 400, borderRadius: 2 }}>

                            {currentTab === "stats" && (
                                <ProjectStatsTab
                                    projectId={projectId}
                                    ecoTaxaLinked={project?.ecotaxa_project_id != null}
                                    onImportData={access.can.import ? () => navigate(`/projects/${projectId}/import`) : undefined}
                                    onLinkProject={access.can.manage ? () => navigate(`/projects/${projectId}/metadata#ecotaxa-link`) : undefined}
                                    notice={hiddenDataNotice}
                                />
                            )}

                            {currentTab === "metadata" && <ProjectMetadataTab projectId={projectId} readOnly={!access.can.manage} />}

                            {currentTab === "data" && (
                                <ProjectDataTab
                                    projectId={projectId}
                                    canSeeFigures={access.can.figures}
                                    canImport={access.can.import}
                                    canManage={access.can.manage}
                                    hiddenDataNotice={hiddenDataNotice}
                                />
                            )}
                            {currentTab === "import" && <ProjectImportTab projectId={projectId} />}
                            {currentTab === "update" && renderComingSoonTab("Update")}
                            {currentTab === "security" && (
                                <ProjectSecurityTab
                                    projectId={projectId}
                                    privacyStatus={access.privacy}
                                    oldestSampleDate={project?.oldest_sample_utc_date_time ?? null}
                                />
                            )}
                            {currentTab === "tasks" && <ProjectTasksTab projectId={projectId} />}
                            {currentTab === "backup" && <ProjectBackupTab projectId={projectId} />}
                        </Box>
                    </>
                )}
            </Container>

            <Snackbar
                open={deleteError !== null}
                autoHideDuration={6000}
                onClose={() => setDeleteError(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setDeleteError(null)}
                    severity="error"
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    Failed to delete the project: {deleteError}
                </Alert>
            </Snackbar>
        </>
    );
}