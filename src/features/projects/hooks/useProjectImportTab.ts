import { useState, useEffect } from "react";
import { AlertColor } from "@mui/material";
import { GridRowSelectionModel } from "@mui/x-data-grid";

import {
    getProjectById,
    getImportableRawSamples,
    getImportableEcoTaxaSamples,
    getImportableCtdSamples,
    ImportableRawSample,
    ImportableEcoTaxaSample,
    ImportableCtdSample,
    importRawSamples,
    importEcoTaxaSamples,
    importProjectCtdSamples,
} from "../api/projects.api";

export const useProjectImportTab = (projectId: number) => {
    // --- 1. LOCAL STATE ---

    const [rootFolderPath, setRootFolderPath] = useState<string>("Loading...");

    // Raw (UVP) Samples State
    const [rawSamples, setRawSamples] = useState<ImportableRawSample[]>([]);
    const [loadingRaw, setLoadingRaw] = useState(false);

    const [selectedRawSamples, setSelectedRawSamples] = useState<GridRowSelectionModel>({
        type: "include",
        ids: new Set(),
    });

    // EcoTaxa Samples State
    const [ecoTaxaSamples, setEcoTaxaSamples] = useState<ImportableEcoTaxaSample[]>([]);
    const [loadingEcoTaxa, setLoadingEcoTaxa] = useState(false);
    const [selectedEcoTaxaSamples, setSelectedEcoTaxaSamples] = useState<GridRowSelectionModel>({
        type: "include",
        ids: new Set(),
    });

    // CTD Samples State
    const [ctdSamples, setCtdSamples] = useState<ImportableCtdSample[]>([]);
    const [loadingCtd, setLoadingCtd] = useState(false);
    const [selectedCtdSamples, setSelectedCtdSamples] = useState<GridRowSelectionModel>({
        type: "include",
        ids: new Set(),
    });

    // Track whether the project has an EcoTaxa project linked
    const [hasEcoTaxaProject, setHasEcoTaxaProject] = useState<boolean>(false);

    // Backup Options State 
    const [enableAutoBackup, setEnableAutoBackup] = useState(false);
    const [skipAlreadyImported, setSkipAlreadyImported] = useState(true);

    const [isImporting, setIsImporting] = useState(false);

    // QC Modal State
    const [isQcModalOpen, setIsQcModalOpen] = useState(false);
    const [importAllUvpFlag, setImportAllUvpFlag] = useState(false);

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
            setLoadingCtd(true);

            try {
                const projectData = await getProjectById(projectId);
                if (isMounted) setRootFolderPath(projectData.root_folder_path || "No path defined");
                // Use ecotaxa_project_id to determine link status, not ecotaxa_project_name
                // (name can be null even if project is linked)
                if (isMounted) setHasEcoTaxaProject(projectData.ecotaxa_project_id != null);

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
                    console.error("Failed to load ecotaxa samples (Backend Error expected)", e);
                } finally {
                    if (isMounted) setLoadingEcoTaxa(false);
                }

                try {
                    const ctdData = await getImportableCtdSamples(projectId);
                    if (isMounted) setCtdSamples(ctdData || []);
                } catch (e) {
                    console.error("Failed to load CTD samples", e);
                } finally {
                    if (isMounted) setLoadingCtd(false);
                }

            } catch (error) {
                console.error("Failed to initialize import tab:", error);
                if (isMounted) {
                    setRootFolderPath("Error loading data");
                    setHasEcoTaxaProject(false);
                    setRawSamples([]);
                    setEcoTaxaSamples([]);
                    setCtdSamples([]);
                }
            } finally {
                if (isMounted) {
                    setLoadingRaw(false);
                    setLoadingEcoTaxa(false);
                    setLoadingCtd(false);
                }
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [projectId]);

    // --- 3. ACTIONS ---

    const showSnackbar = (message: string, severity: AlertColor = "info") => setSnackbar({ open: true, message, severity });
    const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const getSelectionCount = (selectionModel: GridRowSelectionModel, totalRows: number): number => {
        return selectionModel.type === "exclude"
            ? Math.max(totalRows - selectionModel.ids.size, 0)
            : selectionModel.ids.size;
    };

    const getSelectedSampleNames = (
        selectionModel: GridRowSelectionModel,
        allSampleNames: string[],
    ): string[] => {
        if (selectionModel.type === "exclude") {
            const excluded = new Set(Array.from(selectionModel.ids).map(String));
            return allSampleNames.filter((name) => !excluded.has(name));
        }

        return Array.from(selectionModel.ids).map(String);
    };

    /**
     * Maps EcoTaxa sample_id (numeric) to sample_name (string).
     * EcoTaxa samples have sample_id as row ID, but the API expects sample_name.
     */
    const getSelectedEcoTaxaSampleNames = (
        selectionModel: GridRowSelectionModel,
    ): string[] => {
        if (selectionModel.type === "exclude") {
            const excluded = new Set(Array.from(selectionModel.ids).map(Number));
            return ecoTaxaSamples
                .filter((sample) => !excluded.has(sample.sample_id))
                .map((sample) => sample.sample_name);
        }

        const selectedIds = new Set(Array.from(selectionModel.ids).map(Number));
        return ecoTaxaSamples
            .filter((sample) => selectedIds.has(sample.sample_id))
            .map((sample) => sample.sample_name);
    };

    const getSelectedCtdSampleNames = (
        selectionModel: GridRowSelectionModel,
    ): string[] => {
        if (selectionModel.type === "exclude") {
            const excluded = new Set(Array.from(selectionModel.ids).map(String));
            return ctdSamples
                .filter((sample) => !excluded.has(sample.sample_name))
                .map((sample) => sample.sample_name);
        }

        return Array.from(selectionModel.ids).map(String);
    };

    const handlePreImportRawSamples = (importAll: boolean = false) => {
        const count = importAll
            ? rawSamples.length
            : getSelectionCount(selectedRawSamples, rawSamples.length);

        if (count === 0) return showSnackbar("No samples to import.", "warning");

        setImportAllUvpFlag(importAll);
        setIsQcModalOpen(true);
    };

    const confirmAndExecuteRawImport = async () => {
        setIsQcModalOpen(false);
        setIsImporting(true);

        const allRawSampleNames = rawSamples.map((s) => s.sample_name);
        const samplesToImport = importAllUvpFlag
            ? allRawSampleNames
            : getSelectedSampleNames(selectedRawSamples, allRawSampleNames);

        try {
            const response = await importRawSamples(projectId, {
                samples: samplesToImport,
                backup_project: enableAutoBackup,
                backup_project_skip_already_imported: skipAlreadyImported
            });

            if (response?.task_import_samples) {
                showSnackbar(`Import task queued (${response.task_import_samples} samples). Check TASKS tab.`, "success");
            } else {
                showSnackbar("Raw samples import completed. Check TASKS tab.", "success");
            }

            setSelectedRawSamples({ type: "include", ids: new Set() });

            // Ask tasks list to refresh (some imports create tasks asynchronously)
            try { window.dispatchEvent(new CustomEvent("ecopart:tasks:refresh")); } catch { /* ignore */ }

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
        if (!hasEcoTaxaProject) return showSnackbar("No EcoTaxa project linked.", "error");

        const samplesToImport = importAll
            ? ecoTaxaSamples.map((s) => s.sample_name)
            : getSelectedEcoTaxaSampleNames(selectedEcoTaxaSamples);

        if (samplesToImport.length === 0) return showSnackbar("No samples to import.", "warning");

        setIsImporting(true);
        try {
            await importEcoTaxaSamples(projectId, {
                samples: samplesToImport,
                backup_project: enableAutoBackup,
                backup_project_skip_already_imported: skipAlreadyImported
            });

            showSnackbar("EcoTaxa samples import completed successfully.", "success");

            setSelectedEcoTaxaSamples({ type: "include", ids: new Set() });

            // Ask tasks list to refresh in case backend created an async task
            try { window.dispatchEvent(new CustomEvent("ecopart:tasks:refresh")); } catch { /* ignore */ }

            const ecoData = await getImportableEcoTaxaSamples(projectId);
            setEcoTaxaSamples(ecoData || []);
        } catch (error) {
            console.error(error);
            showSnackbar("Failed to import EcoTaxa samples.", "error");
        } finally {
            setIsImporting(false);
        }
    };

    const handleImportCtdSamples = async (importAll: boolean = false) => {
        const samplesToImport = importAll
            ? ctdSamples.map((sample) => sample.sample_name)
            : getSelectedCtdSampleNames(selectedCtdSamples);

        if (samplesToImport.length === 0) return showSnackbar("No CTD samples to import.", "warning");

        setIsImporting(true);
        try {
            const response = await importProjectCtdSamples(projectId, { samples: samplesToImport });

            if (response?.task_id) {
                showSnackbar(`CTD import task #${response.task_id} started. Check TASKS tab.`, "success");
            } else {
                showSnackbar("CTD samples import completed. Check TASKS tab.", "success");
            }

            setSelectedCtdSamples({ type: "include", ids: new Set() });

            try { window.dispatchEvent(new CustomEvent("ecopart:tasks:refresh")); } catch { /* ignore */ }

            const ctdData = await getImportableCtdSamples(projectId);
            setCtdSamples(ctdData || []);
        } catch (error) {
            console.error(error);
            showSnackbar("Failed to import CTD samples.", "error");
        } finally {
            setIsImporting(false);
        }
    };

    return {
        rootFolderPath,
        rawSamples, loadingRaw, selectedRawSamples, setSelectedRawSamples,
        rawSelectionCount: getSelectionCount(selectedRawSamples, rawSamples.length),

        ecoTaxaSamples, loadingEcoTaxa, selectedEcoTaxaSamples, setSelectedEcoTaxaSamples,
        ecoTaxaSelectionCount: getSelectionCount(selectedEcoTaxaSamples, ecoTaxaSamples.length),

        ctdSamples, loadingCtd, selectedCtdSamples, setSelectedCtdSamples,
        ctdSelectionCount: getSelectionCount(selectedCtdSamples, ctdSamples.length),

        hasEcoTaxaProject,

        enableAutoBackup, setEnableAutoBackup,
        skipAlreadyImported, setSkipAlreadyImported,
        isImporting,

        isQcModalOpen, setIsQcModalOpen, importAllUvpFlag,

        handlePreImportRawSamples, confirmAndExecuteRawImport, handleImportEcoTaxaSamples, handleImportCtdSamples,
        snackbar, closeSnackbar
    };
};