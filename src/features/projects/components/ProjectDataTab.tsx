import React from "react";
import {
    Box, Typography, Button, Divider, Snackbar, Alert, Stack, Tooltip, LinearProgress
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close"; // Used for Delete based on mockup
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";

import { ecotaxaColors } from "@/theme";
import SectionCard from "@/shared/components/SectionCard";

import { useProjectDataTab } from "../hooks/useProjectDataTab";
import { EcoTaxaSampleData, SampleData, CtdSampleData } from "../api/projects.api";

interface ProjectDataTabProps {
    projectId: number;
}

// Helper function to format YYYYMMDDHHMMSS strings into readable dates
const formatCompactDate = (dateString?: string) => {
    if (!dateString) return 'Cell';
    // If it's already an ISO string (contains 'T')
    if (dateString.includes('T')) return dateString.split('T')[0];

    // If it's a compact string like 20200806221349
    if (dateString.length >= 8) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}-${month}-${day}`;
    }
    return dateString;
};

export const ProjectDataTab: React.FC<ProjectDataTabProps> = ({ projectId }) => {
    const {
        uvpSamples, loadingUvp, totalUvpRows, uvpPaginationModel, setUvpPaginationModel,
        selectedUvpSamples, setSelectedUvpSamples, uvpSelectionCount,

        ecoTaxaSamples, loadingEcoTaxa, totalEcoTaxaRows, ecoTaxaPaginationModel, setEcoTaxaPaginationModel,
        selectedEcoTaxaSamples, setSelectedEcoTaxaSamples, ecoTaxaSelectionCount,

        ctdSamples, loadingCtd, totalCtdRows, ctdPaginationModel, setCtdPaginationModel,
        selectedCtdSamples, setSelectedCtdSamples, ctdSelectionCount,

        uvpError, ecoTaxaError, ctdError,

        isActionRunning,
        handleDeleteUvpSamples, handleDeleteEcoTaxaSamples, handleDeleteCtdSamples,
        buildEcoTaxaSampleUrl,
        snackbar, closeSnackbar
    } = useProjectDataTab(projectId);

    // --- DATAGRID COLUMNS DEFINITIONS ---

    const uvpSamplesColumns: GridColDef<SampleData>[] = [
        { field: "sample_name", headerName: "Sample name", flex: 1.5, minWidth: 150 },
        {
            field: "sampling_utc_date_time",
            headerName: "Date",
            flex: 1,
            minWidth: 120,
            // MENTOR FIX: Apply date formatting for better readability
            valueGetter: (_value, row) => formatCompactDate(row.sampling_utc_date_time)
        },
        { field: "filename", headerName: "Raw file name", flex: 1.5, minWidth: 150, valueGetter: (_value, row) => row.filename || 'Cell' },
        { field: "sample_type_label", headerName: "Type", flex: 1, minWidth: 100, valueGetter: (_value, row) => row.sample_type_label || 'Cell' },
        { field: "comment", headerName: "Comment", flex: 1.5, minWidth: 150, valueGetter: (_value, row) => row.comment || 'Cell' },
        {
            field: "ctd_imported", headerName: "Linked CTD", flex: 1, minWidth: 100, align: 'center', headerAlign: 'center', renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" color={params.row.ctd_imported ? "textPrimary" : "error"}>
                        {params.row.ctd_imported ? "YES" : "NO"}
                    </Typography>
                </Box>
            )
        },
        {
            field: "visual_qc_status_label",
            headerName: "QC state",
            width: 90,
            align: 'center',
            renderCell: (params: GridRenderCellParams<SampleData>) => {
                const isWarning = params.row.visual_qc_status_label !== "VALIDATED";
                return isWarning ? (
                    <Tooltip title={params.row.visual_qc_status_label || "Warning"}>
                        <WarningAmberIcon color="warning" fontSize="small" />
                    </Tooltip>
                ) : (
                    <Tooltip title="Validated">
                        <CheckCircleIcon color="success" fontSize="small" />
                    </Tooltip>
                );
            },
        },
    ];

    const ctdSamplesColumns: GridColDef<CtdSampleData>[] = [
        { field: "sample_name", headerName: "Sample name", flex: 1.8, minWidth: 180 },
        { field: "ctd_import_utc_date_time", headerName: "Import date", flex: 1.4, minWidth: 150, valueGetter: (_value, row) => formatCompactDate(row.ctd_import_utc_date_time) },
        { field: "file_extension", headerName: "File type", flex: 1, minWidth: 100, valueGetter: (_value, row) => row.file_extension || "Cell" },
    ];

    const ecoTaxaSamplesColumns: GridColDef<EcoTaxaSampleData>[] = [
        { field: "sample_name", headerName: "Sample name", flex: 2, minWidth: 200 },
        { field: "ecotaxa_sample_id", headerName: "EcoTaxa sample ID", flex: 1.5, minWidth: 150, valueGetter: (_value, row) => row.ecotaxa_sample_id || 'Cell' },
        { field: "nb_objects", headerName: "Number of objects", flex: 1, minWidth: 120, valueGetter: (_value, row) => row.nb_objects ?? 0 },
        {
            field: "progress",
            headerName: "Classification progress",
            flex: 2,
            minWidth: 200,
            renderCell: (params) => {
                // An object is "classified" once it leaves the unclassified state
                // (predicted, validated or dubious). nb_objects is the sum of the four counts.
                const total = params.row.nb_objects ?? 0;
                const classified = total - (params.row.nb_unclassified ?? 0);
                const progress = total > 0 ? Math.round((classified / total) * 100) : 0;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress variant="determinate" value={progress} color={progress === 100 ? "success" : "primary"} sx={{ height: 10, borderRadius: 1 }} />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">{`${progress}%`}</Typography>
                        </Box>
                    </Box>
                )
            }
        },
    ];

    // --- REUSABLE STYLES & COMPONENTS ---
    // MENTOR NOTE: Exact same styling logic applied here to maintain consistency across tabs
    const dataGridStyles = {
        border: 'none',
        '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e0e0e0',
            borderTop: 'none',
            color: 'text.secondary',
            fontWeight: 'normal',
        },
        '& .MuiDataGrid-cell': { borderBottom: '1px solid #f0f0f0' },
        '& .MuiDataGrid-row:nth-of-type(even)': { backgroundColor: ecotaxaColors.stone[50] },
        '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: ecotaxaColors.secondblue[100],
            '&:hover': { backgroundColor: ecotaxaColors.secondblue[200] }
        },
        '& .MuiCheckbox-root': { color: ecotaxaColors.stone[400] },
        '& .Mui-checked': { color: `${ecotaxaColors.secondblue[600]} !important` },
        '& .MuiDataGrid-footerContainer': { borderTop: 'none', minHeight: '40px' },
        // Hide focus outline on cells for cleaner look
        '& .MuiDataGrid-cell:focus': { outline: 'none' },
        '& .MuiDataGrid-columnHeader:focus': { outline: 'none' },
    };

    const renderEmptyState = (message: string, isError = false) => (
        <Box sx={{
            border: '1px dashed',
            borderColor: isError ? 'error.main' : '#e0e0e0',
            borderRadius: 1, py: 4, textAlign: 'center',
            color: isError ? 'error.main' : 'text.secondary', mb: 2,
        }}>
            {message}
        </Box>
    );

    return (
        <SectionCard>
            {/* UVP SAMPLES SECTION */}
            <Box sx={{ mb: 6 }}>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">UVP samples</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'grey.100', p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight="bold">{uvpSelectionCount} items selected</Typography>
                    <Stack direction="row" spacing={2}>
                        <Button variant="text" color="inherit" disabled={uvpSelectionCount === 0 || isActionRunning} onClick={handleDeleteUvpSamples} startIcon={<CloseIcon />} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                            DELETE
                        </Button>
                    </Stack>
                </Box>

                {uvpSamples.length === 0 ? (
                    renderEmptyState(
                        loadingUvp ? "Loading UVP samples..."
                            : uvpError ? `Failed to load UVP samples (${uvpError})`
                                : "No samples imported.",
                        !loadingUvp && !!uvpError
                    )
                ) : (
                    <Box sx={{ width: '100%', mb: 1 }}>
                        <DataGrid<SampleData>
                            rows={uvpSamples}
                            columns={uvpSamplesColumns}
                            getRowId={(row) => row.sample_id}
                            checkboxSelection
                            disableRowSelectionExcludeModel
                            disableRowSelectionOnClick
                            loading={loadingUvp}
                            rowSelectionModel={selectedUvpSamples}
                            onRowSelectionModelChange={(newSelection) => setSelectedUvpSamples(newSelection)}
                            paginationMode="server"
                            rowCount={totalUvpRows}
                            paginationModel={uvpPaginationModel}
                            onPaginationModelChange={setUvpPaginationModel}
                            pageSizeOptions={[5, 10, 25, 50, 100, { value: Math.max(totalUvpRows, 1), label: "All" }]}
                            autoHeight
                            sx={dataGridStyles}
                        />
                    </Box>
                )}
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* CTD SAMPLES SECTION */}
            <Box sx={{ mb: 6 }}>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">Links with CTD samples</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'grey.100', p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight="bold">{ctdSelectionCount} items selected</Typography>
                    <Button variant="text" color="inherit" disabled={ctdSelectionCount === 0 || isActionRunning} startIcon={<CloseIcon />} onClick={handleDeleteCtdSamples} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        DELETE
                    </Button>
                </Box>
                {ctdSamples.length === 0 ? (
                    renderEmptyState(
                        loadingCtd ? "Loading CTD samples..."
                            : ctdError ? `Failed to load CTD samples (${ctdError})`
                                : "No CTD samples imported.",
                        !loadingCtd && !!ctdError
                    )
                ) : (
                    <Box sx={{ width: '100%', mb: 1 }}>
                        <DataGrid<CtdSampleData>
                            rows={ctdSamples}
                            columns={ctdSamplesColumns}
                            getRowId={(row) => row.sample_name}
                            checkboxSelection
                            disableRowSelectionExcludeModel
                            disableRowSelectionOnClick
                            loading={loadingCtd}
                            rowSelectionModel={selectedCtdSamples}
                            onRowSelectionModelChange={(newSelection) => setSelectedCtdSamples(newSelection)}
                            paginationModel={ctdPaginationModel}
                            onPaginationModelChange={setCtdPaginationModel}
                            pageSizeOptions={[5, 10, 25, 50, 100, { value: Math.max(totalCtdRows, 1), label: "All" }]}
                            autoHeight
                            sx={dataGridStyles}
                        />
                    </Box>
                )}
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* ECOTAXA SAMPLES SECTION */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">Links with EcoTaxa samples</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'grey.100', p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight="bold">{ecoTaxaSelectionCount} items selected</Typography>
                    <Stack direction="row" spacing={2}>
                        <Button variant="text" color="inherit" disabled={ecoTaxaSelectionCount === 0} startIcon={<OpenInNewIcon />} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                            OPEN IN ECOTAXA
                        </Button>
                        <Button variant="text" color="inherit" disabled={ecoTaxaSelectionCount === 0 || isActionRunning} onClick={handleDeleteEcoTaxaSamples} startIcon={<CloseIcon />} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                            DELETE FROM ECOTAXA
                        </Button>
                    </Stack>
                </Box>

                {ecoTaxaSamples.length === 0 ? (
                    renderEmptyState(
                        loadingEcoTaxa ? "Loading EcoTaxa samples..."
                            : ecoTaxaError ? `Failed to load EcoTaxa samples (${ecoTaxaError})`
                                : "No samples imported into ecotaxa.",
                        !loadingEcoTaxa && !!ecoTaxaError
                    )
                ) : (
                    <Box sx={{ width: '100%', mb: 1 }}>
                        <DataGrid<EcoTaxaSampleData>
                            rows={ecoTaxaSamples}
                            columns={ecoTaxaSamplesColumns}
                            getRowId={(row) => row.sample_name} // Backend expects sample_name array for deletion
                            onRowClick={(params) => {
                                const url = buildEcoTaxaSampleUrl(params.row);
                                if (url) window.open(url, "_blank", "noopener,noreferrer");
                            }}
                            checkboxSelection
                            disableRowSelectionExcludeModel
                            disableRowSelectionOnClick
                            loading={loadingEcoTaxa}
                            rowSelectionModel={selectedEcoTaxaSamples}
                            onRowSelectionModelChange={(newSelection) => setSelectedEcoTaxaSamples(newSelection)}
                            paginationMode="server"
                            rowCount={totalEcoTaxaRows}
                            paginationModel={ecoTaxaPaginationModel}
                            onPaginationModelChange={setEcoTaxaPaginationModel}
                            pageSizeOptions={[5, 10, 25, 50, 100, { value: Math.max(totalEcoTaxaRows, 1), label: "All" }]}
                            autoHeight
                            sx={{ ...dataGridStyles, '& .MuiDataGrid-row': { cursor: buildEcoTaxaSampleUrl(ecoTaxaSamples[0]!) ? 'pointer' : 'default' } }}
                        />
                    </Box>
                )}
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </SectionCard>
    );
};