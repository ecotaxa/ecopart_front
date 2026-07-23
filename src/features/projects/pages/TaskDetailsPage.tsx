import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    Box, Container, Typography, Button, Tabs, Tab, Paper, Grid,
    TextField, LinearProgress, CircularProgress, Alert,
    Stack, InputAdornment, IconButton, Tooltip
} from "@mui/material";

// Icons from your custom mockup design
import AssignmentIcon from "@mui/icons-material/Assignment";
import TerminalIcon from "@mui/icons-material/Terminal";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import MainLayout from "@/app/layouts/MainLayout";
import SectionCard from "@/shared/components/SectionCard";
import { ecotaxaColors } from "@/theme";
import { deleteProjectTask, downloadTaskFile, getOneTask, getTaskLog, Task } from "../api/projects.api";
import { isDownloadableTask } from "../utils/taskColumns";

export default function TaskDetailsPage() {
    const { id, taskId, tabName } = useParams<{ id?: string; taskId: string; tabName?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const parsedProjectId = id ? (Number.isNaN(Number.parseInt(id, 10)) ? null : Number.parseInt(id, 10)) : null;
    const parsedTaskId = taskId ? (Number.isNaN(Number.parseInt(taskId, 10)) ? null : Number.parseInt(taskId, 10)) : null;

    // The active tab is driven by the URL (general / logfile).
    const currentTab = tabName === "logfile" ? 1 : 0;

    // Post-delete/back navigation: the project's tasks tab when opened from a
    // project, otherwise the global tasks list.
    const tasksListPath = parsedProjectId !== null ? `/projects/${parsedProjectId}/tasks` : "/tasks";

    // Where the "Back to tasks list" arrow (and the post-delete redirect) should
    // land. Callers that opened this page from a different list — e.g. the admin
    // console — pass `state.from`; otherwise fall back to the tasks list above.
    // location.state is typed `unknown`, so narrow it before reading `from`.
    const navState = location.state as { from?: unknown } | null;
    const backTo = typeof navState?.from === "string" ? navState.from : tasksListPath;

    // Base path for this task detail, preserving project vs global context.
    const taskDetailBase = parsedProjectId !== null
        ? `/projects/${parsedProjectId}/tasks/${parsedTaskId}`
        : `/tasks/${parsedTaskId}`;

    const handleTabChange = (_e: React.SyntheticEvent, val: number) => {
        navigate(`${taskDetailBase}/${val === 1 ? "logfile" : "general"}`);
    };
    const [task, setTask] = useState<Task | null>(null);
    const [logContent, setLogContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);

    // --- 2. DATA HYDRATION CALLBACK ---
    const loadTaskDetails = useCallback(async (showSpinner = false) => {
        if (parsedTaskId === null) return;
        if (showSpinner) setIsLoading(true);

        try {
            const taskData = await getOneTask(parsedTaskId);
            setTask(taskData);

            // Only fetch logs if we are on the log tab to preserve resources
            if (currentTab === 1) {
                const logs = await getTaskLog(parsedTaskId);
                setLogContent(logs);
            }
            setError(null);
        } catch (err: unknown) {
            console.error("[Task Details] Hydration error:", err);
            setError("Failed to synchronize task metrics from server.");
        } finally {
            if (showSpinner) setIsLoading(false);
        }
    }, [parsedTaskId, currentTab]);

    // Initial explicit load
    useEffect(() => {
        loadTaskDetails(true);
    }, [loadTaskDetails]);

    // --- 3. ADAPTIVE REAL-TIME POLLING LOGIC ---
    useEffect(() => {
        if (!task) return;

        // Check if task status implies background processing is active
        const status = task.task_status?.toUpperCase();
        const isProcessing = status === "RUNNING" || status === "PENDING";

        if (!isProcessing) return;

        // Polling loop every 2500ms
        const intervalId = setInterval(() => {
            loadTaskDetails(false);
        }, 2500);

        return () => clearInterval(intervalId);
    }, [task, loadTaskDetails]);

    const handleDownloadFile = async () => {
        if (parsedTaskId === null) return;
        setIsDownloading(true);
        try {
            await downloadTaskFile(parsedTaskId);
        } catch (err) {
            console.error("[Task Details] Download failed:", err);
            setError(err instanceof Error ? err.message : "Failed to download the export file.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDeleteTask = async () => {
        if (parsedTaskId === null) return;
        if (!window.confirm(
            `Are you sure you want to delete task #${parsedTaskId}? ` +
            `This removes the task and its logs. ` +
            `It does not undo work the task already performed. This cannot be undone.`,
        )) return;

        setIsDeleting(true);
        try {
            await deleteProjectTask(parsedTaskId);
            navigate(backTo);
        } catch (err) {
            console.error("[Task Details] Delete failed:", err);
            setError("Failed to delete task. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    // The task id must be valid. The project id is optional (absent on the
    // global /tasks/:taskId route); only flag it when present but malformed.
    if (parsedTaskId === null || (id !== undefined && parsedProjectId === null)) {
        return (
            <MainLayout>
                <Container sx={{ mt: 4 }}><Alert severity="error">Malformed route identifiers.</Alert></Container>
            </MainLayout>
        );
    }

    // --- 4. CONDITIONAL RENDER HELPERS ---
    const getProgressColor = (status?: string) => {
        const upper = status?.toUpperCase();
        if (upper === "DONE" || upper === "COMPLETED") return "success";
        if (upper === "ERROR" || upper === "FAILED") return "error";
        return "primary";
    };

    const parseTaskParams = (params: unknown) => {
        if (!params) return "{}";
        if (typeof params === "object") return JSON.stringify(params, null, 2);
        if (typeof params === "string") {
            try {
                return JSON.stringify(JSON.parse(params), null, 2);
            } catch {
                return params;
            }
        }
        return String(params);
    };

    const formatTaskOwner = (owner: Task["task_owner"]): string => {
        if (!owner) return "System";

        if (typeof owner === "string") {
            let cleaned = owner
                .replace(/\bundefined\b/gi, "")
                .replace(/\bnull\b/gi, "")
                .replace(/\s+/g, " ")
                .trim();

            if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
                cleaned = cleaned.slice(1, -1).trim();
            }

            return cleaned || "System";
        }

        const ownerObject = owner as Record<string, unknown>;
        const candidateParts = [
            ownerObject.first_name,
            ownerObject.last_name,
            ownerObject.user_name,
        ]
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim())
            .filter((v) => v && v.toLowerCase() !== "undefined" && v.toLowerCase() !== "null");

        if (candidateParts.length > 0) {
            const name = candidateParts.join(" ");
            return ownerObject.email ? `${name} (${ownerObject.email})` : name;
        }

        if (ownerObject.email && typeof ownerObject.email === "string") {
            return ownerObject.email;
        }

        return "System";
    };

    return (
        <MainLayout>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
                {/* BACK NAVIGATION ACTION */}
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(backTo)}
                    sx={{ mb: 3, fontWeight: "bold" }}
                    color="inherit"
                >
                    Back to tasks list
                </Button>

                {isLoading && !task ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
                ) : error && !task ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    task && (
                        <Box>
                            {/* PAGE LEVEL HEADER REGION */}
                            <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Typography variant="h4" fontWeight="bold">
                                    {task.task_type} task [{task.task_id}]
                                </Typography>
                                <Stack direction="row" spacing={2}>
                                    {isDownloadableTask(task) && (
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            size="small"
                                            sx={{ fontWeight: "bold" }}
                                            startIcon={<DownloadIcon />}
                                            onClick={handleDownloadFile}
                                            disabled={isDownloading}
                                        >
                                            {isDownloading ? "DOWNLOADING..." : "DOWNLOAD"}
                                        </Button>
                                    )}
                                    <Button variant="outlined" color="error" size="small" sx={{ fontWeight: "bold" }} onClick={handleDeleteTask} disabled={isDeleting}>{isDeleting ? "DELETING..." : "DELETE"}</Button>
                                </Stack>
                            </Box>

                            {/* NAVIGATION TABS STRUCTURE */}
                            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
                                <Tabs value={currentTab} onChange={handleTabChange}>
                                    <Tab icon={<AssignmentIcon />} iconPosition="start" label="GENERAL" />
                                    <Tab icon={<TerminalIcon />} iconPosition="start" label="LOG FILE" />
                                </Tabs>
                            </Box>

                            {/* TAB CONTEXT DISPLAY PANEL */}
                            {currentTab === 0 ? (
                                <Box>
                                    {/* PROGRESS LINE COMPONENT */}
                                    <SectionCard sx={{ mb: 4, position: "relative" }}>
                                        <Typography variant="h6" sx={{ mb: 2 }}>General</Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 3, mt: 3, mb: 2 }}>
                                            <Box sx={{ width: "100%" }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={task.task_progress_pct ?? 0}
                                                    color={getProgressColor(task.task_status)}
                                                    sx={{ height: 12, borderRadius: 2 }}
                                                />
                                            </Box>
                                            <Typography variant="body1" fontWeight="bold" sx={{ minWidth: 45 }}>
                                                {task.task_progress_pct ?? 0}%
                                            </Typography>
                                        </Box>
                                    </SectionCard>

                                    {/* SPECIFIC ATTRIBUTES META CONTROLS */}
                                    <SectionCard sx={{ mb: 4 }}>
                                        <Typography variant="h6" sx={{ mb: 3 }}>Task information</Typography>
                                        <Box component="form" noValidate autoComplete="off">
                                            <Grid container spacing={3}>
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                    <TextField fullWidth label="ID" value={task.task_id} size="small" InputProps={{ readOnly: true }} />
                                                </Grid>
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                    <TextField fullWidth label="Status" value={task.task_status ?? "UNKNOWN"} size="small" InputProps={{ readOnly: true }} />
                                                </Grid>
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                    <TextField fullWidth label="Type" value={task.task_type ?? "Unknown"} size="small" InputProps={{ readOnly: true }} />
                                                </Grid>
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                    <TextField
                                                        fullWidth
                                                        label="Project ID"
                                                        value={task.task_project_id ?? "Global scope"}
                                                        size="small"
                                                        InputProps={{
                                                            readOnly: true,
                                                            endAdornment: task.task_project_id != null ? (
                                                                <InputAdornment position="end">
                                                                    <Tooltip title="Open project">
                                                                        <IconButton
                                                                            size="small"
                                                                            edge="end"
                                                                            onClick={() => navigate(`/projects/${task.task_project_id}/metadata`)}
                                                                            aria-label="Open project"
                                                                        >
                                                                            <OpenInNewIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </InputAdornment>
                                                            ) : undefined,
                                                        }}
                                                    />
                                                </Grid>
                                                <Grid size={{ xs: 12 }}>
                                                    <TextField fullWidth label="Message" value={task.task_progress_msg ?? "No report message available"} size="small" InputProps={{ readOnly: true }} />
                                                </Grid>
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                    <TextField fullWidth label="Owner" value={formatTaskOwner(task.task_owner)} size="small" InputProps={{ readOnly: true }} />
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </SectionCard>

                                    {/* INPUT ARGUMENTS ARBORESCENCE TREE */}
                                    <SectionCard>
                                        <Typography variant="h6" sx={{ mb: 2 }}>Input parameters :</Typography>
                                        <Box
                                            sx={{
                                                p: 3,
                                                backgroundColor: ecotaxaColors.secondblue[50],
                                                borderRadius: 1,
                                                border: `1px solid ${ecotaxaColors.secondblue[100]}`,
                                                fontFamily: "monospace",
                                                fontSize: "0.85rem",
                                                whiteSpace: "pre-wrap"
                                            }}
                                        >
                                            {parseTaskParams(task.task_params)}
                                        </Box>
                                    </SectionCard>
                                </Box>
                            ) : (
                                /* TEXT STREAM CONSOLE COMPONENT */
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 3,
                                        backgroundColor: "#1e1e1e",
                                        color: "#d4d4d4",
                                        fontFamily: "'Courier New', Courier, monospace",
                                        fontSize: "0.9rem",
                                        lineHeight: 1.6,
                                        minHeight: "450px",
                                        maxHeight: "650px",
                                        overflowY: "auto",
                                        boxShadow: "inset 0px 2px 8px rgba(0,0,0,0.8)"
                                    }}
                                >
                                    {logContent ? (
                                        logContent.split("\n").map((line, idx) => (
                                            <Box key={idx} sx={{
                                                color: line.includes("failed") || line.includes("error") ? ecotaxaColors.danger[400] : line.includes("successfully") || line.includes("done") ? ecotaxaColors.success[400] : "#d4d4d4"
                                            }}>
                                                {line}
                                            </Box>
                                        ))
                                    ) : (
                                        <Box sx={{ color: "text.disabled", fontStyle: "italic" }}>No log messages captured yet by the kernel stream handler.</Box>
                                    )}
                                </Paper>
                            )}
                        </Box>
                    )
                )}
            </Container>
        </MainLayout>
    );
}