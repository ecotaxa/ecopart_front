import {
    Box, Container, Typography, Button, TextField, MenuItem,
    Snackbar, Alert, Stack, IconButton, CircularProgress, Tooltip
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";

import { useNavigate } from "react-router-dom";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";

import MainLayout from "@/app/layouts/MainLayout";
import SectionCard from "@/shared/components/SectionCard";
import { ecotaxaColors } from "@/theme";
import { useTasksTable } from "../hooks/useTasksTable";
import { Task } from "../api/projects.api";
import { buildBaseTaskColumns, isDownloadableTask } from "../utils/taskColumns";

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
        downloadingTaskId, handleDownloadTaskFile,
        snackbar, closeSnackbar
    } = useTasksTable();

    const columns: GridColDef<Task>[] = [
        ...buildBaseTaskColumns(),
        {
            field: "actions",
            headerName: "",
            width: 90,
            sortable: false,
            renderCell: (params: GridRenderCellParams<Task>) => {
                if (!isDownloadableTask(params.row)) return null;
                const isDownloading = downloadingTaskId === params.row.task_id;
                return (
                    // Stop clicks anywhere in the actions cell from bubbling to the
                    // row's onRowClick (the disabled download button otherwise reaches
                    // the row via its Tooltip span and navigates away mid-download).
                    <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Download export file">
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={isDownloading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadTaskFile(params.row.task_id);
                                    }}
                                >
                                    {isDownloading
                                        ? <CircularProgress size={16} />
                                        : <DownloadIcon fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
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
        "& .MuiDataGrid-cell": { borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center" },
        "& .MuiDataGrid-row": { cursor: "pointer" },
        "& .MuiDataGrid-row:nth-of-type(even)": { backgroundColor: ecotaxaColors.stone[50] },
        "& .MuiDataGrid-row.Mui-selected": {
            backgroundColor: ecotaxaColors.secondblue[100],
            "&:hover": { backgroundColor: ecotaxaColors.secondblue[200] }
        },
    };

    return (
        <MainLayout>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
                <Box sx={{ mb: 4, textAlign: "center" }}>
                    <Typography variant="h4" gutterBottom>My tasks</Typography>
                </Box>

                {error && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="error" variant="outlined">
                            Failed to load tasks: <strong>{error}</strong>
                        </Alert>
                    </Box>
                )}

                <SectionCard sx={{ p: 0, overflow: "hidden" }}>
                    {/* HEADER + FILTER CONTROLS */}
                    <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider" }}>
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
                                <MenuItem value="task_type">Label</MenuItem>
                                <MenuItem value="task_owner">Owner</MenuItem>
                                <MenuItem value="task_status">Status</MenuItem>
                                <MenuItem value="task_id">Task id</MenuItem>
                            </TextField>
                        </Stack>
                    </Box>

                    {/* SELECTION ACTIONS BAR */}
                    <Box sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "grey.100" }}>
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
                        </Stack>
                    </Box>

                    {/* 3. TABLE */}
                    <Box sx={{ width: "100%" }}>
                        <DataGrid
                            rows={tasks}
                            columns={columns}
                            getRowId={(row) => row.task_id}
                            onRowClick={(params) => navigate(`/tasks/${params.row.task_id}/general`)}
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
                </SectionCard>

                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                    <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Container>
        </MainLayout>
    );
}
