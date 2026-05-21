import React from "react";
import {
    Box, Typography, Button, Switch, FormControlLabel,
    TextField, Divider, Snackbar, Alert, InputAdornment, Paper, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";

import { useProjectImportTab } from "../hooks/useProjectImportTab";
import { ImportableRawSample, ImportableCtdSample } from "../api/projects.api";

interface ProjectImportTabProps {
    projectId: number;
}

export const ProjectImportTab: React.FC<ProjectImportTabProps> = ({ projectId }) => {
    const {
        rootFolderPath,
        rawSamples, loadingRaw, selectedRawSamples, setSelectedRawSamples, rawSelectionCount,
        ecoTaxaSamples, loadingEcoTaxa, selectedEcoTaxaSamples, setSelectedEcoTaxaSamples, ecoTaxaSelectionCount,
        ctdSamples, loadingCtd, selectedCtdSamples, setSelectedCtdSamples, ctdSelectionCount,
        enableAutoBackup, setEnableAutoBackup,
        skipAlreadyImported, setSkipAlreadyImported,
        isImporting,
        isQcModalOpen, setIsQcModalOpen, importAllUvpFlag,
        handlePreImportRawSamples, confirmAndExecuteRawImport, handleImportEcoTaxaSamples, handleImportCtdSamples,
        snackbar, closeSnackbar, hasEcoTaxaProject
    } = useProjectImportTab(projectId);

    const ecoProjectLinked = hasEcoTaxaProject;
    const ecoTaxaActionsDisabled = !ecoProjectLinked;

    // --- DATAGRID COLUMNS DEFINITIONS ---
    const rawSamplesColumns: GridColDef<ImportableRawSample>[] = [
        {
            field: "qc_lvl1",
            headerName: "",
            width: 50,
            renderCell: (params: GridRenderCellParams<ImportableRawSample>) => {
                if (params.row.qc_lvl1 === undefined) return null;
                return params.row.qc_lvl1 ? (
                    <Tooltip title="Data valid">
                        <CheckCircleIcon color="success" fontSize="small" />
                    </Tooltip>
                ) : (
                    <Tooltip title={params.row.qc_lvl1_comment || "Data invalid"}>
                        <ErrorIcon color="error" fontSize="small" />
                    </Tooltip>
                );
            },
        },
        { field: "sample_name", headerName: "Name", flex: 1.5, minWidth: 150 },
        { field: "raw_file_name", headerName: "Raw file name", flex: 1.5, minWidth: 150, valueGetter: (_value, row) => row.raw_file_name ?? "Cell" },
        { field: "station_id", headerName: "Station ID", flex: 1, minWidth: 100, valueGetter: (_value, row) => row.station_id ?? "Cell" },
        { field: "first_image", headerName: "First image frame", flex: 1, minWidth: 100, valueGetter: (_value, row) => row.first_image ?? "Cell" },
        { field: "last_image", headerName: "Last image frame", flex: 1, minWidth: 100, valueGetter: (_value, row) => row.last_image ?? "Cell" },
        {
            field: "images_count",
            headerName: "Images",
            flex: 0.8,
            minWidth: 100,
            renderCell: (params: GridRenderCellParams<ImportableRawSample>) => {
                const first = params.row.first_image;
                const last = params.row.last_image;

                // Both values present and numeric -> compute count
                if (typeof first === 'number' && typeof last === 'number') {
                    const count = Math.max(0, last - first + 1);
                    if (count === 0) {
                        return (
                            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Tooltip title="No images">
                                    <ErrorIcon color="error" fontSize="small" />
                                </Tooltip>
                            </Box>
                        );
                    }

                    return (
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ textAlign: 'center', width: '100%' }}>{count}</Typography>
                        </Box>
                    );
                }

                // If either is missing treat as no images
                return (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Tooltip title="No images">
                            <ErrorIcon color="error" fontSize="small" />
                        </Tooltip>
                    </Box>
                );
            },
        },
        { field: "comment", headerName: "Comment", flex: 2, minWidth: 150, valueGetter: (_value, row) => row.comment ?? "Cell" },
    ];

    const ecoTaxaSamplesColumns: GridColDef[] = [
        { field: "sample_name", headerName: "Sample name", flex: 2, minWidth: 200 },
        { field: "tsv_file_name", headerName: "TSV file name", flex: 2, minWidth: 200 },
        {
            field: "images",
            headerName: "Images",
            flex: 1,
            minWidth: 100,
            renderCell: (params: GridRenderCellParams) => {
                const images = params.row.images;

                // If no images or zero, show error icon
                if (images === undefined || images === null || images === 0) {
                    return (
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Tooltip title="No images">
                                <ErrorIcon color="error" fontSize="small" />
                            </Tooltip>
                        </Box>
                    );
                }

                // Otherwise show the number
                return (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ textAlign: 'center', width: '100%' }}>{images}</Typography>
                    </Box>
                );
            },
        },
    ];

    const ctdSamplesColumns: GridColDef[] = [
        { field: "sample_name", headerName: "Sample name", flex: 2, minWidth: 180 },
        { field: "ctd_sample_id", headerName: "CTD sample ID", flex: 1.5, minWidth: 160, valueGetter: (_value, row) => row.ctd_sample_id ?? row.sample_name },
        { field: "file_extension", headerName: "File extension", flex: 1, minWidth: 120, valueGetter: (_value, row) => row.file_extension ?? "ctd" },
        { field: "station_id", headerName: "Station ID", flex: 1, minWidth: 120, valueGetter: (_value, row) => row.station_id ?? "Cell" },
    ];

    // --- PIXEL PERFECT STYLING ---
    const dataGridStyles = {
        border: 'none',
        borderBottom: '1px solid #e0e0e0',
        borderRadius: 0,
        '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#ffffff',
            borderTop: 'none',
            borderBottom: '1px solid #e0e0e0',
            minHeight: '48px !important',
            maxHeight: '48px !important',
            color: 'text.secondary',
            fontWeight: 'normal',
        },
        '& .MuiDataGrid-cell': { borderBottom: 'none' },
        '& .MuiDataGrid-row:nth-of-type(even)': { backgroundColor: '#f8faff' },
        '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: '#e6f0ff',
            '&:hover': { backgroundColor: '#d9e8ff' }
        },
        '& .MuiCheckbox-root': { color: '#b0b0b0' },
        '& .Mui-checked': { color: '#1976d2 !important' },
        '& .MuiDataGrid-footerContainer': { borderTop: '1px solid #e0e0e0', minHeight: '40px' }
    };

    const renderSelectionBar = (count: number, onImport: () => void, disabled: boolean, isEcoTaxa: boolean = false) => (
        <Box sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: '#f5f5f5', p: 1.5, borderTop: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0'
        }}>
            <Typography variant="body2" fontWeight="bold">
                {count} items selected
            </Typography>
            <Button
                variant="text"
                color="inherit"
                disabled={disabled}
                onClick={onImport}
                startIcon={isEcoTaxa ? <CloudUploadIcon /> : <AddIcon />}
                sx={{ fontWeight: 'bold', color: 'text.primary', '&.Mui-disabled': { color: 'text.disabled' } }}
            >
                {isEcoTaxa ? "IMPORT SELECTION IN ECOTAXA" : "IMPORT SELECTION"}
            </Button>
        </Box>
    );

    const renderEmptyState = (message: string) => (
        <Box sx={{ border: '1px dashed #ccc', borderRadius: 1, p: 3, textAlign: 'center', color: 'text.secondary', mb: 2 }}>
            {message}
        </Box>
    );

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom>
                Import
            </Typography>
            <Divider sx={{ mb: 4 }} />

            <Paper variant="outlined" sx={{ p: 4, mb: 4 }}>
                <Box sx={{ mb: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5, position: 'relative', top: '10px', backgroundColor: 'white', px: 0.5, zIndex: 1 }}>
                        Root folder path*
                    </Typography>
                    <TextField
                        fullWidth
                        value={rootFolderPath}
                        disabled
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <FolderOpenIcon color="disabled" />
                                </InputAdornment>
                            ),
                        }}
                        size="small"
                        sx={{ '& .Mui-disabled': { WebkitTextFillColor: 'rgba(0, 0, 0, 0.6) !important' } }}
                    />
                </Box>

                {/* 2. NEW UVP SAMPLES */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                            <Typography variant="h6">New UVP samples</Typography>
                            <Typography variant="body2" color="text.secondary">Additional description if required</Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            color="inherit"
                            disabled={rawSamples.length === 0 || isImporting}
                            onClick={() => handlePreImportRawSamples(true)}
                            sx={{ borderColor: '#e0e0e0', color: 'text.secondary' }}
                        >
                            IMPORT ALL
                        </Button>
                    </Box>

                    {/* MENTOR FIX: Updated empty state text to "0 samples found." */}
                    {rawSamples.length === 0 ? (
                        renderEmptyState(loadingRaw ? "Loading samples..." : "0 samples found.")
                    ) : (
                        <Box sx={{ width: '100%', mb: 1 }}>
                            {renderSelectionBar(rawSelectionCount, () => handlePreImportRawSamples(false), rawSelectionCount === 0 || isImporting)}
                            <DataGrid
                                rows={rawSamples}
                                columns={rawSamplesColumns}
                                getRowId={(row) => row.sample_name}
                                checkboxSelection
                                disableRowSelectionOnClick
                                loading={loadingRaw}
                                rowSelectionModel={selectedRawSamples}
                                onRowSelectionModelChange={(newSelection) => setSelectedRawSamples(newSelection)}
                                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                                pageSizeOptions={[5, 10, 25]}
                                autoHeight
                                sx={dataGridStyles}
                            />
                        </Box>
                    )}
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* 4. NEW CTD SAMPLES */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                            <Typography variant="h6">New CTD samples</Typography>
                            <Typography variant="body2" color="text.secondary">Additional description if required</Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            color="inherit"
                            disabled={ctdSamples.length === 0 || isImporting}
                            onClick={() => handleImportCtdSamples(true)}
                            sx={{ borderColor: '#e0e0e0', color: 'text.secondary' }}
                        >
                            IMPORT ALL
                        </Button>
                    </Box>

                    {ctdSamples.length === 0 ? (
                        renderEmptyState(loadingCtd ? "Loading CTD samples..." : "0 samples found.")
                    ) : (
                        <Box sx={{ width: '100%', mb: 1 }}>
                            {renderSelectionBar(ctdSelectionCount, () => handleImportCtdSamples(false), ctdSelectionCount === 0 || isImporting)}
                            <DataGrid<ImportableCtdSample>
                                rows={ctdSamples}
                                columns={ctdSamplesColumns}
                                getRowId={(row) => row.sample_name}
                                checkboxSelection
                                disableRowSelectionOnClick
                                loading={loadingCtd}
                                rowSelectionModel={selectedCtdSamples}
                                onRowSelectionModelChange={(newSelection) => setSelectedCtdSamples(newSelection)}
                                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                                pageSizeOptions={[5, 10, 25]}
                                autoHeight
                                sx={dataGridStyles}
                            />
                        </Box>
                    )}
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* 5. BACKUP OPTIONS */}
                <Box sx={{ mb: 4 }}>
                    <FormControlLabel
                        control={<Switch checked={enableAutoBackup} onChange={(e) => setEnableAutoBackup(e.target.checked)} disabled={isImporting} />}
                        label="Enable automatic backup of the raw project at every import"
                    />

                    <Box sx={{ ml: 4, mt: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">Options</Typography>
                        <FormControlLabel
                            control={<Switch checked={skipAlreadyImported} onChange={(e) => setSkipAlreadyImported(e.target.checked)} disabled={!enableAutoBackup || isImporting} />}
                            label="Skip already imported"
                            sx={{ mt: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: 0.5 }}>
                            Imports all items or only new ones based on this option. Missing samples are not deleted in any case.
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* 6. NEW ECOTAXA SAMPLES */}
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, opacity: ecoTaxaActionsDisabled ? 0.65 : 1 }}>
                        <Box>
                            <Typography variant="h6">New EcoTaxa samples</Typography>
                            <Typography variant="body2" color="text.secondary">Import metadata and images data directly in EcoTaxa</Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            color="inherit"
                            disabled={!ecoProjectLinked || ecoTaxaSamples.length === 0 || isImporting}
                            onClick={() => handleImportEcoTaxaSamples(true)}
                            sx={{ borderColor: '#e0e0e0', color: ecoProjectLinked ? 'text.secondary' : 'text.disabled' }}
                        >
                            IMPORT ALL IN ECOTAXA
                        </Button>
                    </Box>

                    {/* If there is no linked EcoTaxa project show an error message and disable import actions */}
                    {
                        !ecoProjectLinked ? (
                            <Box sx={{ border: '1px dashed #f44336', borderRadius: 1, p: 3, textAlign: 'center', color: 'error.main', mb: 2 }}>
                                <Typography variant="body2" color="error" fontWeight="bold">
                                    Pas de projet EcoTaxa lié
                                </Typography>
                            </Box>
                        ) : ecoTaxaSamples.length === 0 ? (
                            // MENTOR FIX: Updated empty state text to "0 samples found."
                            renderEmptyState(loadingEcoTaxa ? "Loading samples..." : "0 samples found.")
                        ) : (
                            <Box sx={{ width: '100%', mb: 1 }}>
                                {renderSelectionBar(ecoTaxaSelectionCount, () => handleImportEcoTaxaSamples(false), !ecoProjectLinked || ecoTaxaSelectionCount === 0 || isImporting, true)}
                                <DataGrid
                                    rows={ecoTaxaSamples}
                                    columns={ecoTaxaSamplesColumns}
                                    getRowId={(row) => row.sample_id}
                                    checkboxSelection
                                    disableRowSelectionOnClick
                                    loading={loadingEcoTaxa}
                                    rowSelectionModel={selectedEcoTaxaSamples}
                                    onRowSelectionModelChange={(newSelection) => setSelectedEcoTaxaSamples(newSelection)}
                                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                                    pageSizeOptions={[5, 10, 25]}
                                    autoHeight
                                    sx={dataGridStyles}
                                />
                            </Box>
                        )
                    }
                </Box>
            </Paper>

            {/* --- QC MODAL --- */}
            <Dialog open={isQcModalOpen} onClose={() => setIsQcModalOpen(false)} maxWidth="lg" fullWidth scroll="paper">
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" fontWeight="bold">Import quality control</Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ backgroundColor: '#fafafa' }}>
                    <Typography variant="body1" sx={{ mb: 4 }}>
                        You are about to import <strong>{importAllUvpFlag ? rawSamples.length : rawSelectionCount}</strong> samples.
                    </Typography>

                    <Box sx={{ backgroundColor: 'white', p: 3, borderRadius: 1, border: '1px solid #e0e0e0', mb: 4 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>Sample : 123GUFYG765-Huh_UVP</Typography>
                        <Grid container spacing={4}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Box sx={{ border: '1px dashed #ccc', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">Vertical profile chart placeholder</Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>UVP frames selection</Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="First ok" value="407" size="small" InputProps={{ readOnly: true }} /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Last ok" value="999999999999" size="small" InputProps={{ readOnly: true }} /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Last used" value="4108" size="small" InputProps={{ readOnly: true }} /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Other filtered images" value="0 / 0%" size="small" InputProps={{ readOnly: true }} /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Removed images" value="74 / 3%" size="small" helperText="Between first and last image frame in number/percent" InputProps={{ readOnly: true }} /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Removed empty slice" value="0" size="small" InputProps={{ readOnly: true }} /></Grid>
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid container spacing={4} sx={{ mt: 2 }}>
                            <Grid size={{ xs: 4 }}><Box sx={{ border: '1px dashed #ccc', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption" color="text.secondary">Chart 1</Typography></Box></Grid>
                            <Grid size={{ xs: 4 }}><Box sx={{ border: '1px dashed #ccc', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption" color="text.secondary">Chart 2</Typography></Box></Grid>
                            <Grid size={{ xs: 4 }}><Box sx={{ border: '1px dashed #ccc', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption" color="text.secondary">Chart 3</Typography></Box></Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setIsQcModalOpen(false)} sx={{ color: 'orange', fontWeight: 'bold' }}>CANCEL IMPORT</Button>
                    <Button onClick={confirmAndExecuteRawImport} variant="text" sx={{ color: '#1976d2', fontWeight: 'bold' }}>VALIDATE ALL</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};