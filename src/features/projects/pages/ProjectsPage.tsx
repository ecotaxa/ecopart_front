import { useState } from "react";
import {
    Box, Container, Typography, Button, TextField, Stack, Chip,
    InputAdornment, Paper, Menu, MenuItem, IconButton
} from "@mui/material";
import {
    DataGrid, GridColDef, GridRenderCellParams,
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
import { Project } from "../api/projects.api";

// IMPORT OUR NEW BRAIN (The Custom Hook)
import { useProjectsTable } from "../hooks/useProjectsTable";

export default function ProjectsPage() {
    const navigate = useNavigate();

    // 1. WE CONNECT THE BRAIN TO THE FACE
    const {
        projects, loading, totalRows,
        searchText, setSearchText,
        selectedFilter, setSelectedFilter,
        paginationModel, setPaginationModel,
        rowSelectionModel, setRowSelectionModel
    } = useProjectsTable();

    // 2. UI-ONLY STATES (These stay in the component because they relate to the DOM)
    const [attribute, setAttribute] = useState("Property 1");
    const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
    const openFilter = Boolean(filterAnchorEl);

    // 3. UI HANDLERS
    const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setFilterAnchorEl(event.currentTarget);
    };

    const handleFilterClose = (filterValue?: string) => {
        setFilterAnchorEl(null);
        if (typeof filterValue === "string") {
            setSelectedFilter(filterValue); // Updates the hook's state
        }
    };

    const handleExploreSelection = () => {
        const joinedIds = Array.from(rowSelectionModel.ids).join(",");
        navigate(`/explore?projects=${joinedIds}`);
    };

    const handleClearSelection = () => {
        setRowSelectionModel({ type: "include", ids: new Set() });
    };

    // 4. COLUMNS
    const columns: GridColDef[] = [
        {
            field: "title", headerName: "Title [ID]", flex: 1.5,
            renderCell: (params: GridRenderCellParams<Project>) => (
                <span style={{ fontWeight: 500 }}>
                    {params.value} <span style={{ color: "#888" }}>[{params.row.project_id}]</span>
                </span>
            ),
        },
        { field: "instrument", headerName: "Instrument", flex: 1 },
        { field: "ecotaxa_project_name", headerName: "EcoTaxa Project", flex: 1.5 },
        { field: "root_folder", headerName: "RootFolder", flex: 2 },
        { field: "nbr_sample", headerName: "Nbr Sample", width: 120 },
        {
            field: "privilege", headerName: "Privilege", width: 120,
            renderCell: (params) => (
                <Chip label={params.value} size="small" sx={{ backgroundColor: "#e0e0e0", fontWeight: "bold" }} />
            ),
        },
        {
            field: "qc_state", headerName: "QC state", width: 150,
            renderCell: (params) => {
                if (params.value === "validated") return <CheckCircleIcon color="success" />;
                if (params.value === "warning")
                    return (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <WarningIcon color="warning" fontSize="small" />
                            <Typography variant="caption" color="warning.main">calibration</Typography>
                        </Stack>
                    );
                return <Typography variant="caption">{params.value}</Typography>;
            },
        },
    ];

    // 5. RENDER
    return (
        <MainLayout>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
                <Box sx={{ mb: 4, textAlign: "center" }}>
                    <Typography variant="h4" gutterBottom>Projects</Typography>
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
                            placeholder="Name, email, etc..."
                            size="small"
                            sx={{ flexGrow: 1 }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }}
                        />

                        <TextField
                            select label="Attribute" value={attribute}
                            onChange={(e) => setAttribute(e.target.value)}
                            size="small" sx={{ width: 150 }}
                        >
                            <MenuItem value="Property 1">Property 1</MenuItem>
                            <MenuItem value="Property 2">Property 2</MenuItem>
                        </TextField>

                        <Button startIcon={<FilterListIcon />} color="inherit" onClick={handleFilterClick}>
                            {selectedFilter === "All" ? "Filter" : `Filter: ${selectedFilter}`}
                        </Button>
                        
                        <Menu anchorEl={filterAnchorEl} open={openFilter} onClose={() => handleFilterClose()}>
                            <MenuItem onClick={() => handleFilterClose("All")}>All Projects</MenuItem>
                            <MenuItem onClick={() => handleFilterClose("Manager")}>My Managed Projects</MenuItem>
                            <MenuItem onClick={() => handleFilterClose("Validated")}>Validated QC</MenuItem>
                        </Menu>

                        <Button variant="contained" startIcon={<AddIcon />}>NEW PROJECT</Button>
                    </Stack>
                </Paper>

                <Paper sx={{ width: "100%", overflow: "hidden" }}>
                    {rowSelectionModel.ids.size > 0 && (
                        <Box sx={{ p: 2, backgroundColor: "#f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e0e0e0" }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <IconButton size="small" onClick={handleClearSelection} title="Clear selection">
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                                <Typography fontWeight="bold">{rowSelectionModel.ids.size} items selected</Typography>
                            </Stack>
                            <Button color="inherit" endIcon={<ArrowForwardIcon />} onClick={handleExploreSelection} sx={{ fontWeight: "bold" }}>
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
                            
                            sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f5f5f5", fontWeight: "bold", borderTop: rowSelectionModel.ids.size > 0 ? "none" : undefined } }}
                        />
                    </Box>
                </Paper>
            </Container>
        </MainLayout>
    );
}