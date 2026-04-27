import React from "react";
import {
    Box, Typography, Button, Switch, FormControlLabel,
    TextField, Divider, Snackbar, Alert, InputAdornment, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

import { useProjectImportTab } from "../hooks/useProjectImportTab";

interface ProjectImportTabProps {
    projectId: number;
}

export const ProjectImportTab: React.FC<ProjectImportTabProps> = ({ projectId }) => {
    const {
        rootFolderPath,

        rawSamples, loadingRaw, selectedRawSamples, setSelectedRawSamples, rawSelectionCount,
        ctdSamples, selectedCtdSamples, setSelectedCtdSamples, ctdSelectionCount,
        ecoTaxaSamples, loadingEcoTaxa, selectedEcoTaxaSamples, setSelectedEcoTaxaSamples, ecoTaxaSelectionCount,

        enableAutoBackup, setEnableAutoBackup,
        skipAlreadyImported, setSkipAlreadyImported,
        isImporting,

        isQcModalOpen, setIsQcModalOpen, importAllUvpFlag,

        handlePreImportRawSamples, confirmAndExecuteRawImport, handleImportEcoTaxaSamples,
        snackbar, closeSnackbar
    } = useProjectImportTab(projectId);

    // --- DATAGRID COLUMNS DEFINITIONS (Strictly matching mockups) ---
    const rawSamplesColumns: GridColDef[] = [
        { field: "sample_name", headerName: "Name", flex: 1.5, minWidth: 150 },
        { field: "raw_file_name", headerName: "Raw file name", flex: 1.5, minWidth: 150, valueGetter: (_value, row) => row.raw_file_name ?? "Cell" },
        { field: "station_id", headerName: "Station ID", flex: 1, minWidth: 100, valueGetter: (_value, row) => row.station_id ?? "Cell" },
        { field: "first_image", headerName: "First image", flex: 1, minWidth: 100, valueGetter: (_value, row) => row.first_image ?? "Cell" },
        { field: "last_image", headerName: "Last image", flex: 1, minWidth: 100, valueGetter: (_value, row) => row.last_image ?? "Cell" },
        { field: "comment", headerName: "Comment", flex: 2, minWidth: 150, valueGetter: (_value, row) => row.comment ?? "Cell" },
    ];

    const ctdSamplesColumns: GridColDef[] = [
        { field: "sample_name", headerName: "Sample name", flex: 1.5, minWidth: 150 },
        { field: "ctd_sample_id", headerName: "CTD sample ID", flex: 1.5, minWidth: 150 },
        { field: "file_extension", headerName: "File extension", flex: 1, minWidth: 100 },
        { field: "station_id", headerName: "Station ID", flex: 1, minWidth: 100 },
    ];

    const ecoTaxaSamplesColumns: GridColDef[] = [
        { field: "sample_name", headerName: "Sample name", flex: 2, minWidth: 200 },
        { field: "tsv_file_name", headerName: "TSV file name", flex: 2, minWidth: 200 },
        { field: "images", headerName: "Images", flex: 1, minWidth: 100 },
    ];

    // --- PIXEL-PERFECT STYLING ---
    const dataGridStyles = {
        border: 'none',
        '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#ffffff', // White headers
            borderBottom: '1px solid #e0e0e0',
            borderTop: 'none',
            color: 'text.secondary',
            fontWeight: 'normal',
        },
        '& .MuiDataGrid-cell': { borderBottom: '1px solid #f0f0f0' },
        '& .MuiDataGrid-row:nth-of-type(even)': { backgroundColor: '#f8faff' }, // Light blue tint
        '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: '#e3f2fd', // Deep blue tint for selected rows
            '&:hover': { backgroundColor: '#d9e8ff' }
        },
        '& .MuiCheckbox-root': { color: '#b0b0b0' },
        '& .Mui-checked': { color: '#1976d2 !important' },
        '& .MuiDataGrid-footerContainer': { borderTop: '1px solid #e0e0e0', minHeight: '40px' }
    };

    // Reusable Top Selection Bar Component (Above headers)
    const renderSelectionBar = (count: number, onImport: () => void, disabled: boolean, isEcoTaxa: boolean = false) => (
        <Box sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: '#f5f5f5', p: 1.5, borderBottom: '1px solid #e0e0e0'
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

    const renderEmptyState = (message: string, isEcoTaxa: boolean = false) => (
        <Box>
            <Box sx={{ border: '1px dashed #ccc', borderRadius: 1, p: 3, textAlign: 'center', color: 'text.secondary', mb: 2 }}>
                {message}
            </Box>
            {/* The mockup shows the selection bar below the dashed box when empty */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5 }}>
                <Typography variant="body2" fontWeight="bold">0 items selected</Typography>
                <Button variant="text" color="inherit" disabled sx={{ fontWeight: 'bold', color: 'text.disabled' }}>
                    {isEcoTaxa ? "IMPORT SELECTION IN ECOTAXA" : "IMPORT SELECTION"}
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h5" gutterBottom>Import</Typography>
            <Divider sx={{ mb: 4 }} />

            <Paper variant="outlined" sx={{ p: 4, mb: 4 }}>

                {/* 1. ROOT FOLDER (Read-Only) */}
                <Box sx={{ mb: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5, position: 'relative', top: '10px', backgroundColor: 'white', px: 0.5, zIndex: 1 }}>
                        Root folder path*
                    </Typography>
                    <TextField
                        fullWidth
                        value={rootFolderPath}
                        disabled
                        InputProps={{
                            endAdornment: <InputAdornment position="end"><FolderOpenIcon color="disabled" /></InputAdornment>,
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
                            variant="outlined" color="inherit"
                            disabled={rawSamples.length === 0 || isImporting}
                            onClick={() => handlePreImportRawSamples(true)}
                            sx={{ borderColor: '#e0e0e0', color: 'text.secondary' }}
                        >
                            IMPORT ALL
                        </Button>
                    </Box>

                    {rawSamples.length === 0 ? (
                        renderEmptyState(loadingRaw ? "Loading raw samples..." : "0 raw samples found on server.")
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

                {/* 3. BACKUP OPTIONS */}
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

                {/* 4. NEW CTD SAMPLES (Mocked) */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                            <Typography variant="h6">New CTD samples</Typography>
                            <Typography variant="body2" color="text.secondary">Additional description if required</Typography>
                        </Box>
                        <Button variant="outlined" color="inherit" sx={{ borderColor: '#e0e0e0', color: 'text.secondary' }}>
                            IMPORT ALL
                        </Button>
                    </Box>
                    <Box sx={{ width: '100%', mb: 1 }}>
                        {renderSelectionBar(ctdSelectionCount, () => { }, false)}
                        <DataGrid
                            rows={ctdSamples}
                            columns={ctdSamplesColumns}
                            getRowId={(row) => row.id}
                            checkboxSelection
                            rowSelectionModel={selectedCtdSamples}
                            onRowSelectionModelChange={(newSelection) => setSelectedCtdSamples(newSelection)}
                            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                            pageSizeOptions={[5, 10, 25]}
                            autoHeight
                            sx={dataGridStyles}
                        />
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* 5. NEW ECOTAXA SAMPLES */}
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                            <Typography variant="h6">New EcoTaxa samples</Typography>
                            <Typography variant="body2" color="text.secondary">Import metadata and images data directly in EcoTaxa</Typography>
                        </Box>
                        <Button
                            variant="outlined" color="inherit"
                            disabled={ecoTaxaSamples.length === 0 || isImporting}
                            onClick={() => handleImportEcoTaxaSamples(true)}
                            sx={{ borderColor: '#e0e0e0', color: 'text.secondary' }}
                        >
                            IMPORT ALL IN ECOTAXA
                        </Button>
                    </Box>

                    {ecoTaxaSamples.length === 0 ? (
                        renderEmptyState(loadingEcoTaxa ? "Loading EcoTaxa samples..." : "0 EcoTaxa samples found.", true)
                    ) : (
                        <Box sx={{ width: '100%', mb: 1 }}>
                            {renderSelectionBar(ecoTaxaSelectionCount, () => handleImportEcoTaxaSamples(false), ecoTaxaSelectionCount === 0 || isImporting, true)}
                            <DataGrid
                                rows={ecoTaxaSamples}
                                columns={ecoTaxaSamplesColumns}
                                getRowId={(row) => row.sample_name}
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
                    )}
                </Box>
            </Paper>

            {/* --- IMPORT QUALITY CONTROL MODAL (THE MISSING SECTION) --- */}
            <Dialog open={isQcModalOpen} onClose={() => setIsQcModalOpen(false)} maxWidth="lg" fullWidth scroll="paper">
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" fontWeight="bold">Import quality control</Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ backgroundColor: '#fafafa' }}>
                    <Typography variant="body1" sx={{ mb: 4 }}>
                        You are about to import <strong>{importAllUvpFlag ? rawSamples.length : rawSelectionCount}</strong> samples.
                    </Typography>

                    {/* Placeholder for the complex charts shown in the mockup */}
                    <Box sx={{ backgroundColor: 'white', p: 3, borderRadius: 1, border: '1px solid #e0e0e0', mb: 4 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>Sample : 123GUFYG765-Huh_UVP</Typography>

                        <Grid container spacing={4}>
                            {/* Left Chart Area */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Box sx={{ border: '1px dashed #ccc', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">Vertical profile chart placeholder</Typography>
                                </Box>
                            </Grid>

                            {/* Right Inputs Area */}
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>UVP frames selection</Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="First ok" value="407" size="small" /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Last ok" value="999999999999" size="small" /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Last used" value="4108" size="small" /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Other filtered images" value="0 / 0%" size="small" /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Removed images" value="74 / 3%" size="small" helperText="Between first and last image in number/percent" /></Grid>
                                    <Grid size={{ xs: 6 }}><TextField fullWidth label="Removed empty slice" value="0" size="small" /></Grid>
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