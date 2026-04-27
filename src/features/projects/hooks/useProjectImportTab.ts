import { useState, useEffect } from "react";
import { AlertColor } from "@mui/material";
import { GridRowSelectionModel } from "@mui/x-data-grid";

import { 
    getProjectById,
    getImportableRawSamples, 
    getImportableEcoTaxaSamples,
    ImportableRawSample,
    ImportableEcoTaxaSample,
    importRawSamples,
    importEcoTaxaSamples
} from "../api/projects.api";

export const useProjectImportTab = (projectId: number) => {
    // --- 1. LOCAL STATE ---
    
    const [rootFolderPath, setRootFolderPath] = useState<string>("Loading...");
    
    // Raw (UVP) Samples State
    const [rawSamples, setRawSamples] = useState<ImportableRawSample[]>([]);
    const [loadingRaw, setLoadingRaw] = useState(false);
    const [selectedRawSamples, setSelectedRawSamples] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });
    
    // EcoTaxa Samples State
    const [ecoTaxaSamples, setEcoTaxaSamples] = useState<ImportableEcoTaxaSample[]>([]);
    const [loadingEcoTaxa, setLoadingEcoTaxa] = useState(false);
    const [selectedEcoTaxaSamples, setSelectedEcoTaxaSamples] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });

    // CTD Samples State (MOCKED for UI matching)
    // MENTOR NOTE: Mock data added to perfectly match the mockup's populated state
    const [ctdSamples] = useState([
        { id: 1, sample_name: 'Cell', ctd_sample_id: 'Cell', file_extension: 'cnv', station_id: 'Cell' },
        { id: 2, sample_name: 'Cell', ctd_sample_id: 'Cell', file_extension: 'ctd', station_id: 'Cell' },
        { id: 3, sample_name: 'Cell', ctd_sample_id: 'Cell', file_extension: 'ctd', station_id: 'Cell' },
    ]);
    // Mocking the selection of the 3rd row to match mockup
    const [selectedCtdSamples, setSelectedCtdSamples] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set([3]) });

    // Backup Options State 
    const [enableAutoBackup, setEnableAutoBackup] = useState(false);
    const [skipAlreadyImported, setSkipAlreadyImported] = useState(true);

    const [isImporting, setIsImporting] = useState(false);

    // --- QUALITY CONTROL MODAL STATE (The Missing Section) ---
    const [isQcModalOpen, setIsQcModalOpen] = useState(false);
    const [importAllUvpFlag, setImportAllUvpFlag] = useState(false); // Remembers if the user clicked "Import All" or "Selection"

    // Notifications
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false, message: "", severity: "info",
    });

    // --- 2. LIFECYCLE & DATA FETCHING ---
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            setLoadingRaw(true);
            setLoadingEcoTaxa(true);

            try {
                const projectData = await getProjectById(projectId);
                if (isMounted) setRootFolderPath(projectData.root_folder_path || "No path defined");

                try {
                    const rawData = await getImportableRawSamples(projectId);
                    if (isMounted) setRawSamples(rawData || []);
                } catch (e) {
                    console.error("Failed to load raw samples", e);
                } finally {
                    if (isMounted) setLoadingRaw(false);
                }

                try {
                    const ecoTaxaData = await getImportableEcoTaxaSamples(projectId);
                    if (isMounted) setEcoTaxaSamples(ecoTaxaData || []);
                } catch (e) {
                    console.error("Failed to load ecotaxa samples", e);
                } finally {
                    if (isMounted) setLoadingEcoTaxa(false);
                }

            } catch (error) {
                console.error("Failed to initialize import tab:", error);
                if (isMounted) setRootFolderPath("Error loading data");
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [projectId]);

    // --- 3. ACTIONS & WORKFLOWS ---

    const showSnackbar = (message: string, severity: AlertColor = "info") => setSnackbar({ open: true, message, severity });
    const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    // STEP 1: Intercept the UVP Import click to open the Modal
    const handlePreImportRawSamples = (importAll: boolean = false) => {
        const selectedIds = Array.from(selectedRawSamples.ids) as string[];
        const count = importAll ? rawSamples.length : selectedIds.length;
        
        if (count === 0) return showSnackbar("No samples to import.", "warning");

        setImportAllUvpFlag(importAll);
        setIsQcModalOpen(true); // Open the QC Modal instead of fetching
    };

    // STEP 2: The actual API call executed from inside the Modal
    const confirmAndExecuteRawImport = async () => {
        setIsQcModalOpen(false); // Close modal
        setIsImporting(true);

        const selectedIds = Array.from(selectedRawSamples.ids) as string[];
        const samplesToImport = importAllUvpFlag 
            ? rawSamples.map(s => s.sample_name) 
            : selectedIds;

        try {
            await importRawSamples(projectId, {
                samples: samplesToImport,
                backup_project: enableAutoBackup,
                backup_project_skip_already_imported: skipAlreadyImported
            });
            showSnackbar("Raw samples imported successfully.", "success");
            setSelectedRawSamples({ type: 'include', ids: new Set() }); 
            
            const rawData = await getImportableRawSamples(projectId);
            setRawSamples(rawData || []);
        } catch (error) {
            console.error(error);
            showSnackbar("Failed to import raw samples.", "error");
        } finally {
            setIsImporting(false);
        }
    };

    const handleImportEcoTaxaSamples = async (importAll: boolean = false) => {
        const selectedIds = Array.from(selectedEcoTaxaSamples.ids) as string[];
        const samplesToImport = importAll 
            ? ecoTaxaSamples.map(s => s.sample_name) 
            : selectedIds;

        if (samplesToImport.length === 0) return showSnackbar("No samples to import.", "warning");

        setIsImporting(true);
        try {
            await importEcoTaxaSamples(projectId, {
                samples: samplesToImport,
                backup_project: enableAutoBackup,
                backup_project_skip_already_imported: skipAlreadyImported
            });
            showSnackbar("EcoTaxa samples import completed successfully.", "success");
            setSelectedEcoTaxaSamples({ type: 'include', ids: new Set() });
            
            const ecoData = await getImportableEcoTaxaSamples(projectId);
            setEcoTaxaSamples(ecoData || []);
        } catch (error) {
            console.error(error);
            showSnackbar("Failed to import EcoTaxa samples.", "error");
        } finally {
            setIsImporting(false);
        }
    };

    return {
        rootFolderPath,
        
        rawSamples, loadingRaw, selectedRawSamples, setSelectedRawSamples,
        rawSelectionCount: selectedRawSamples.ids.size,
        
        ctdSamples, selectedCtdSamples, setSelectedCtdSamples,
        ctdSelectionCount: selectedCtdSamples.ids.size,

        ecoTaxaSamples, loadingEcoTaxa, selectedEcoTaxaSamples, setSelectedEcoTaxaSamples,
        ecoTaxaSelectionCount: selectedEcoTaxaSamples.ids.size,

        enableAutoBackup, setEnableAutoBackup,
        skipAlreadyImported, setSkipAlreadyImported,
        isImporting,
        
        // QC Modal properties
        isQcModalOpen, setIsQcModalOpen, importAllUvpFlag,
        
        // Actions
        handlePreImportRawSamples, confirmAndExecuteRawImport, handleImportEcoTaxaSamples,
        snackbar, closeSnackbar
    };
};