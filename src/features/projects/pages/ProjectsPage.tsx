import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Container,
    Typography,
    Button,
    TextField,
    Stack,
    Chip,
    InputAdornment,
    Paper,
    Menu,
    MenuItem,
    IconButton,
    Alert
} from "@mui/material";
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridRowParams, // Import this type for the row click handler
} from "@mui/x-data-grid";

import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";

import { useNavigate } from "react-router-dom";
import MainLayout from "@/app/layouts/MainLayout";
import { MinimalUserModel, Project } from "../api/projects.api";
import { useProjectsTable } from "../hooks/useProjectsTable";

// Read the authenticated user from the auth store
import { useAuthStore } from "@/features/auth/store/auth.store";

/**
 * ProjectsPage Component
 *
 * Displays a paginated list of projects with filtering, searching, and selection capabilities.
 * It integrates with the `useProjectsTable` hook for server-side data fetching.
 */
export default function ProjectsPage() {
    const navigate = useNavigate();

    // ---------------------------------------------------------------------------
    // Auth State
    // ---------------------------------------------------------------------------
    const currentUser = useAuthStore((s) => s.user);

    // ---------------------------------------------------------------------------
    // State Management (via Custom Hook)
    // ---------------------------------------------------------------------------
    const {
        projects,
        loading,
        totalRows,
        error,
        searchText,
        setSearchText,
        searchAttribute,
        setSearchAttribute,
        selectedFilter,
        setSelectedFilter,
        paginationModel,
        setPaginationModel,
        rowSelectionModel,
        setRowSelectionModel
    } = useProjectsTable();

    // ---------------------------------------------------------------------------
    // Local UI State
    // ---------------------------------------------------------------------------
    const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
    const openFilter = Boolean(filterAnchorEl);

    // ---------------------------------------------------------------------------
    // Debug Helpers
    // ---------------------------------------------------------------------------
    const normalizedCurrentUserId = useMemo(() => {
        if (!currentUser?.user_id && currentUser?.user_id !== 0) {
            return null;
        }

        const parsed = Number(currentUser.user_id);
        return Number.isNaN(parsed) ? null : parsed;
    }, [currentUser]);

    useEffect(() => {
        console.log("[ProjectsPage] currentUser from store:", currentUser);
        console.log("[ProjectsPage] normalizedCurrentUserId:", normalizedCurrentUserId);
    }, [currentUser, normalizedCurrentUserId]);

    useEffect(() => {
        if (projects.length > 0) {
            console.log("[ProjectsPage] first project:", projects[0]);
        }
    }, [projects]);

    // ---------------------------------------------------------------------------
    // Event Handlers
    // ---------------------------------------------------------------------------
    const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setFilterAnchorEl(event.currentTarget);
    };

    const handleFilterClose = (filterValue?: string) => {
        setFilterAnchorEl(null);
        if (typeof filterValue === "string") {
            setSelectedFilter(filterValue);
        }
    };

    const handleExploreSelection = () => {
        const joinedIds = Array.from(rowSelectionModel.ids).join(",");
        navigate(`/explore?projects=${joinedIds}`);
    };

    const handleClearSelection = () => {
        setRowSelectionModel({ type: "include", ids: new Set() });
    };

    // Handle clicking on a specific row to view/edit project details
    const handleRowClick = (params: GridRowParams<Project>) => {
        // Navigate to the project details/edit page using the specific project ID.
        // Make sure you have a route configured in your App.tsx like: <Route path="/projects/:id" element={<ProjectEditPage />} />
        navigate(`/projects/${params.row.project_id}`);
    };

    // ---------------------------------------------------------------------------
    // Helper Functions
    // ---------------------------------------------------------------------------

    const hasCurrentUser = (
        users: MinimalUserModel[] | undefined,
        currentUserId: number | null
    ): boolean => {
        if (!Array.isArray(users) || currentUserId === null) {
            return false;
        }

        return users.some((user) => {
            const normalizedUserId = Number(user.user_id);
            return !Number.isNaN(normalizedUserId) && normalizedUserId === currentUserId;
        });
    };

    const getCurrentUserPrivilege = (project: Project): string | null => {
        if (normalizedCurrentUserId === null) {
            return null;
        }

        const isManager = hasCurrentUser(project.managers, normalizedCurrentUserId);
        if (isManager) return "Manager";

        const isMember = hasCurrentUser(project.members, normalizedCurrentUserId);
        if (isMember) return "Member";

        const normalizedContactUserId =
            project.contact && project.contact.user_id !== undefined
                ? Number(project.contact.user_id)
                : null;

        if (
            normalizedContactUserId !== null &&
            !Number.isNaN(normalizedContactUserId) &&
            normalizedContactUserId === normalizedCurrentUserId
        ) {
            return "Contact";
        }

        return null;
    };

    // ---------------------------------------------------------------------------
    // DataGrid Columns Configuration
    // ---------------------------------------------------------------------------
    const columns: GridColDef[] = [
        {
            field: "project_title",
            headerName: "Title",
            flex: 1.5,
            renderCell: (params: GridRenderCellParams<Project>) => (
                <span style={{ fontWeight: 500 }}>
                    {params.value} <span style={{ color: "#888" }}>[{params.row.project_id}]</span>
                </span>
            ),
        },
        { field: "instrument_model", headerName: "Instrument", flex: 1 },
        {
            field: "ecotaxa_project_name",
            headerName: "EcoTaxa Project",
            flex: 1.5,
            renderCell: (params) =>
                params.value ? (
                    <Typography variant="body2">{params.value}</Typography>
                ) : (
                    <Chip
                        label="Not linked"
                        size="small"
                        variant="outlined"
                        color="default"
                        sx={{ color: "text.secondary", borderColor: "divider" }}
                    />
                ),
        },
        { field: "root_folder_path", headerName: "RootFolder", flex: 2 },
        { field: "nbr_sample", headerName: "Nbr Sample", width: 120 },
        {
            field: "privilege",
            headerName: "Privilege",
            width: 120,
            renderCell: (params: GridRenderCellParams<Project>) => {
                const privilege = getCurrentUserPrivilege(params.row);
                return privilege ? (
                    <Chip
                        label={privilege}
                        size="small"
                        sx={{
                            backgroundColor: "#e0e0e0",
                            fontWeight: "bold",
                        }}
                    />
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        -
                    </Typography>
                );
            },
        },
        {
            field: "qc_state",
            headerName: "QC state",
            width: 150,
            renderCell: (params) => {
                if (params.value === "validated") return <CheckCircleIcon color="success" />;
                if (params.value === "warning")
                    return (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <WarningIcon color="warning" fontSize="small" />
                            <Typography variant="caption" color="warning.main">
                                calibration
                            </Typography>
                        </Stack>
                    );

                return params.value ? (
                    <Typography variant="caption">{params.value}</Typography>
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        -
                    </Typography>
                );
            },
        },
    ];

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <MainLayout>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
                <Box sx={{ mb: 4, textAlign: "center" }}>
                    <Typography variant="h4" gutterBottom>
                        Projects
                    </Typography>
                </Box>

                <Paper sx={{ p: 3, mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6">Your projects</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Projects in which you have privilege
                            </Typography>
                        </Box>
                    </Box>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 3, alignItems: "center" }}>
                        <TextField
                            placeholder="Search..."
                            size="small"
                            sx={{ flexGrow: 1 }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            select
                            label="Attribute"
                            value={searchAttribute}
                            onChange={(e) => setSearchAttribute(e.target.value)}
                            size="small"
                            sx={{ width: 150 }}
                        >
                            <MenuItem value="project_title">Title</MenuItem>
                            <MenuItem value="project_acronym">Acronym</MenuItem>
                            <MenuItem value="cruise">Cruise</MenuItem>
                            <MenuItem value="data_owner_email">Owner Email</MenuItem>
                        </TextField>

                        <Button startIcon={<FilterListIcon />} color="inherit" onClick={handleFilterClick}>
                            {selectedFilter === "All" ? "Filter" : `Filter: ${selectedFilter}`}
                        </Button>

                        <Menu anchorEl={filterAnchorEl} open={openFilter} onClose={() => handleFilterClose()}>
                            <MenuItem onClick={() => handleFilterClose("All")}>All Projects</MenuItem>
                            <MenuItem onClick={() => handleFilterClose("Manager")}>My Managed Projects</MenuItem>
                            <MenuItem onClick={() => handleFilterClose("Validated")}>Validated QC</MenuItem>
                        </Menu>

                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/new-project")}>
                            NEW PROJECT
                        </Button>
                    </Stack>
                </Paper>

                {error && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="error" variant="outlined">
                            Failed to load projects from server: <strong>{error}</strong>
                        </Alert>
                    </Box>
                )}

                <Paper sx={{ width: "100%", overflow: "hidden" }}>
                    {rowSelectionModel.ids.size > 0 && (
                        <Box
                            sx={{
                                p: 2,
                                backgroundColor: "#f5f5f5",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderBottom: "1px solid #e0e0e0",
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <IconButton size="small" onClick={handleClearSelection} title="Clear selection">
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                                <Typography fontWeight="bold">{rowSelectionModel.ids.size} items selected</Typography>
                            </Stack>

                            <Button
                                color="inherit"
                                endIcon={<ArrowForwardIcon />}
                                onClick={handleExploreSelection}
                                sx={{ fontWeight: "bold" }}
                            >
                                EXPLORE SELECTION
                            </Button>
                        </Box>
                    )}

                    <Box sx={{ height: 600 }}>
                        <DataGrid
                            rows={projects}
                            columns={columns}
                            getRowId={(row) => row.project_id}
                            pagination
                            paginationMode="server"
                            rowCount={totalRows}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            checkboxSelection
                            rowSelectionModel={rowSelectionModel}
                            onRowSelectionModelChange={setRowSelectionModel}
                            loading={loading}
                            pageSizeOptions={[5, 10, 25]}
                            disableRowSelectionOnClick
                            onRowClick={handleRowClick} // Attach the click handler to the grid rows
                            sx={{
                                border: 0,
                                // Add pointer cursor to indicate rows are clickable
                                '& .MuiDataGrid-row': {
                                    cursor: 'pointer',
                                },
                                "& .MuiDataGrid-columnHeaders": {
                                    backgroundColor: "#f5f5f5",
                                    fontWeight: "bold",
                                    borderTop: rowSelectionModel.ids.size > 0 ? "none" : undefined,
                                },
                            }}
                        />
                    </Box>
                </Paper>
            </Container>
        </MainLayout>
    );
}