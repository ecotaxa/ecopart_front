import React from "react";
import {
    Box, Typography, Button, TextField, MenuItem, Divider,
    Snackbar, Alert, Stack, IconButton
} from "@mui/material";

// System design elements mapping the user mockup icons
import CloseIcon from "@mui/icons-material/Close";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckIcon from "@mui/icons-material/Check";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useProjectTasksTab } from "../hooks/useProjectTasksTab";
import { Task } from "../api/projects.api";

interface ProjectTasksTabProps {
    projectId: number;
}

export const ProjectTasksTab: React.FC<ProjectTasksTabProps> = ({ projectId }) => {
    const {
        tasks, loading, totalRows,
        paginationModel, setPaginationModel,
        selectedTasks, setSelectedTasks, selectionCount,
        searchText, setSearchText,
        searchAttribute, setSearchAttribute,
        isActionRunning,
        handleDeleteTasks,
        snackbar, closeSnackbar
    } = useProjectTasksTab(projectId);

    const formatTaskOwner = (owner: Task["task_owner"]): string => {
        if (!owner) {
            return "System";
        }

        if (typeof owner === "string") {
            const cleaned = owner
                .replace(/\bundefined\b/gi, "")
                .replace(/\s+/g, " ")
                .trim();

            return cleaned || "System";
        }

        const ownerObject = owner as Record<string, unknown>;
        const candidateParts = [
            ownerObject.user_name,
            ownerObject.first_name,
            ownerObject.last_name,
        ]
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value && value.toLowerCase() !== "undefined");

        if (candidateParts.length > 0) {
            return candidateParts.join(" ");
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

    // --- DATAGRID RENDERING CONTRACTS ---
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
            renderCell: () => (
                <IconButton size="small">
                    <OpenInNewIcon fontSize="small" />
                </IconButton>
            )
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
        <Box sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom>Tasks</Typography>
            <Divider sx={{ mb: 4 }} />

            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, backgroundColor: "white" }}>
                {/* 1. FILTER CONTROLS BAR */}
                <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #e0e0e0" }}>
                    <TextField
                        size="small"
                        placeholder="Label, owner, etc..."
                        label="Search"
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
                        <MenuItem value="task_type">Label</MenuItem>
                        <MenuItem value="task_owner">Owner</MenuItem>
                        <MenuItem value="task_progress_msg">Message</MenuItem>
                    </TextField>
                </Box>

                {/* 2. TASK CONTEXT ACTIONS BAR */}
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
                        <Button variant="text" color="inherit" disabled startIcon={<PlayArrowIcon />} sx={{ fontWeight: "bold" }}>
                            RESTART
                        </Button>
                    </Stack>
                </Box>

                {/* 3. CORE TABLE VIEW */}
                <Box sx={{ width: "100%" }}>
                    <DataGrid
                        rows={tasks}
                        columns={columns}
                        getRowId={(row) => row.task_id}
                        checkboxSelection
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
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};