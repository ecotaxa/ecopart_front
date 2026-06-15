import {
    Box, Container, Typography, Button, TextField, MenuItem,
    Snackbar, Alert, Stack, IconButton, Paper
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import PauseIcon from "@mui/icons-material/Pause";
import CheckIcon from "@mui/icons-material/Check";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { useNavigate } from "react-router-dom";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";

import MainLayout from "@/app/layouts/MainLayout";
import { useTasksTable } from "../hooks/useTasksTable";
import { Task } from "../api/projects.api";

/**
 * TasksPage — global Tasks list (TopBar "Tasks" link, route `/tasks`).
 *
 * Lists the tasks of every project the current user has access to (scoping is
 * enforced server-side). Mirrors the ProjectsPage layout and reuses the column
 * rendering of ProjectTasksTab, but the row "open" action targets the task's own
 * project (`task_project_id`) instead of a fixed project prop.
 */
export default function TasksPage() {
    const navigate = useNavigate();

    const {
        tasks, loading, totalRows, error,
        paginationModel, setPaginationModel,
        selectedTasks, setSelectedTasks, selectionCount,
        searchText, setSearchText,
        searchAttribute, setSearchAttribute,
        isActionRunning,
        handleDeleteTasks,
        snackbar, closeSnackbar
    } = useTasksTable();

    const formatTaskOwner = (owner: Task["task_owner"]): string => {
        if (!owner) {
            return "System";
        }

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
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value && value.toLowerCase() !== "undefined" && value.toLowerCase() !== "null");

        if (candidateParts.length > 0) {
            const name = candidateParts.join(" ");
            return ownerObject.email ? `${name} (${ownerObject.email})` : name;
        }

        if (ownerObject.email && typeof ownerObject.email === "string") {
            return ownerObject.email;
        }

        return "System";
    };

    const formatTaskStatus = (task: Task): string => {
        const statusLabel = task.task_status?.trim();
        if (statusLabel) {
            return statusLabel.toUpperCase();
        }

        if (typeof task.task_status_id === "number") {
            return `STATUS ${task.task_status_id}`;
        }

        return "UNKNOWN";
    };

    const columns: GridColDef<Task>[] = [
        { field: "task_id", headerName: "Task id", width: 90 },
        { field: "task_type", headerName: "Label", flex: 1, minWidth: 120 },
        {
            field: "task_owner",
            headerName: "Owner",
            flex: 1.5,
            minWidth: 150,
            valueGetter: (_value, row) => formatTaskOwner(row.task_owner),
        },
        {
            field: "task_status",
            headerName: "Status",
            width: 170,
            align: "center",
            renderCell: (params: GridRenderCellParams<Task>) => {
                const status = formatTaskStatus(params.row);

                if (status === "DONE" || status === "COMPLETED") {
                    return (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <CheckIcon color="success" fontSize="small" />
                            <Typography variant="body2">{status}</Typography>
                        </Stack>
                    );
                }

                if (status === "ERROR" || status === "FAILED") {
                    return (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <PriorityHighIcon color="error" fontSize="small" />
                            <Typography variant="body2">{status}</Typography>
                        </Stack>
                    );
                }

                return (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <MoreHorizIcon color="warning" fontSize="small" />
                        <Typography variant="body2">{status}</Typography>
                    </Stack>
                );
            },
        },
        {
            field: "task_progress_pct",
            headerName: "Progress",
            width: 100,
            align: "center",
            valueGetter: (_value, row) => `${row.task_progress_pct ?? 0}%`
        },
        { field: "task_progress_msg", headerName: "Message", flex: 2, minWidth: 200, valueGetter: (_value, row) => row.task_progress_msg ?? "No status report" },
        {
            field: "task_creation_date",
            headerName: "Creation",
            flex: 1.5,
            minWidth: 150,
            valueGetter: (_value, row) => row.task_creation_date ? new Date(row.task_creation_date).toLocaleString() : ""
        },
        {
            field: "task_end_date",
            headerName: "Last update",
            flex: 1.5,
            minWidth: 150,
            valueGetter: (_value, row) => row.task_end_date ? new Date(row.task_end_date).toLocaleString() : (row.task_creation_date ? new Date(row.task_creation_date).toLocaleString() : "")
        },
        {
            field: "actions",
            headerName: "",
            width: 50,
            sortable: false,
            renderCell: (params: GridRenderCellParams<Task>) => {
                const projectId = params.row.task_project_id;
                return (
                    <IconButton
                        size="small"
                        disabled={projectId == null}
                        onClick={() => projectId != null && navigate(`/projects/${projectId}/tasks/${params.row.task_id}`)}
                    >
                        <OpenInNewIcon fontSize="small" />
                    </IconButton>
                );
            }
        }
    ];

    const dataGridStyles = {
        border: "none",
        "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e0e0e0",
            color: "text.secondary",
            fontWeight: "normal",
        },
        "& .MuiDataGrid-cell": { borderBottom: "1px solid #f0f0f0" },
        "& .MuiDataGrid-row:nth-of-type(even)": { backgroundColor: '#f8faff' },
        "& .MuiDataGrid-row.Mui-selected": {
            backgroundColor: "#e6f0ff",
            "&:hover": { backgroundColor: "#d9e8ff" }
        },
    };

    return (
        <MainLayout>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
                <Box sx={{ mb: 4, textAlign: "center" }}>
                    <Typography variant="h4" gutterBottom>Tasks</Typography>
                </Box>

                {error && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="error" variant="outlined">
                            Failed to load tasks: <strong>{error}</strong>
                        </Alert>
                    </Box>
                )}

                <Paper sx={{ width: "100%", overflow: "hidden" }}>
                    {/* 1. HEADER + FILTER CONTROLS */}
                    <Box sx={{ p: 3, borderBottom: "1px solid #e0e0e0" }}>
                        <Typography variant="h6">Your tasks</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Projects in which you have permissions
                        </Typography>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 3, alignItems: "center" }}>
                            <TextField
                                size="small"
                                label="Search"
                                placeholder={searchAttribute === "task_id" ? "Search by id (exact)" : "e.g. done, error, running..."}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                sx={{ width: 300 }}
                            />
                            <TextField
                                select
                                size="small"
                                label="Attribute"
                                value={searchAttribute}
                                onChange={(e) => setSearchAttribute(e.target.value)}
                                sx={{ width: 200 }}
                            >
                                <MenuItem value="task_status">Status</MenuItem>
                                <MenuItem value="task_id">Task id</MenuItem>
                            </TextField>
                        </Stack>
                    </Box>

                    {/* 2. SELECTION ACTIONS BAR */}
                    <Box sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f5f5f5" }}>
                        <Typography variant="body2" fontWeight="bold">
                            {selectionCount} items selected
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="text" color="inherit"
                                disabled={selectionCount === 0 || isActionRunning}
                                onClick={handleDeleteTasks}
                                startIcon={<CloseIcon />}
                                sx={{ fontWeight: "bold" }}
                            >
                                DELETE
                            </Button>
                            <Button variant="text" color="inherit" disabled startIcon={<PauseIcon />} sx={{ fontWeight: "bold" }}>
                                STOP
                            </Button>
                        </Stack>
                    </Box>

                    {/* 3. TABLE */}
                    <Box sx={{ width: "100%" }}>
                        <DataGrid
                            rows={tasks}
                            columns={columns}
                            getRowId={(row) => row.task_id}
                            checkboxSelection
                            disableRowSelectionExcludeModel
                            disableRowSelectionOnClick
                            loading={loading}
                            rowSelectionModel={selectedTasks}
                            onRowSelectionModelChange={setSelectedTasks}
                            paginationMode="server"
                            rowCount={totalRows}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[5, 10, 25]}
                            autoHeight
                            sx={dataGridStyles}
                        />
                    </Box>
                </Paper>

                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                    <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Container>
        </MainLayout>
    );
}
