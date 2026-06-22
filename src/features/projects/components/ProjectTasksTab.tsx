import React from "react";
import {
    Box, Typography, Button, TextField, MenuItem, Divider,
    Snackbar, Alert, Stack, IconButton
} from "@mui/material";

// System design elements mapping the user mockup icons
import CloseIcon from "@mui/icons-material/Close";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { useNavigate } from "react-router-dom";

import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useProjectTasksTab } from "../hooks/useProjectTasksTab";
import { Task } from "../api/projects.api";
import { buildBaseTaskColumns } from "../utils/taskColumns";

interface ProjectTasksTabProps {
    projectId: number;
}

export const ProjectTasksTab: React.FC<ProjectTasksTabProps> = ({ projectId }) => {
    const navigate = useNavigate();

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

    // --- DATAGRID RENDERING CONTRACTS ---
    const columns: GridColDef<Task>[] = [
        ...buildBaseTaskColumns(),
        {
            field: "actions",
            headerName: "",
            width: 50,
            sortable: false,
            renderCell: (params) => (
                <IconButton size="small" onClick={() => navigate(`/projects/${projectId}/tasks/${params.row.task_id}`)}>
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
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};