import { useState, useEffect, useCallback } from "react";
import { AlertColor } from "@mui/material";
import { GridRowSelectionModel, GridPaginationModel } from "@mui/x-data-grid";

import {
    searchProjectSamples,
    searchProjectEcoTaxaSamples,
    searchProjectCtdSamples,
    deleteProjectSample,
    deleteProjectEcoTaxaSamples,
    deleteProjectCtdSamples,
    SampleData,
    EcoTaxaSampleData,
    CtdSampleData
} from "../api/projects.api";

export const useProjectDataTab = (projectId: number) => {
    // --- 1. LOCAL STATE ---

    // Helper to create an empty Set for MUI DataGrid Pro/Premium
    const createEmptySelectionModel = (): GridRowSelectionModel => ({ type: "include", ids: new Set() });
    const getSelectionCount = (selectionModel: GridRowSelectionModel, totalRows: number): number => {
        return selectionModel.type === "exclude"
            ? Math.max(totalRows - selectionModel.ids.size, 0)
            : selectionModel.ids.size;
    };

    const getSelectedUvpSampleIds = (selectionModel: GridRowSelectionModel): number[] => {
        if (selectionModel.type === "exclude") {
            const excludedIds = new Set(Array.from(selectionModel.ids).map(Number));
            return uvpSamples
                .filter((sample) => !excludedIds.has(sample.sample_id))
                .map((sample) => sample.sample_id);
        }

        return Array.from(selectionModel.ids).map(Number);
    };

    const getSelectedEcoTaxaSampleNames = (selectionModel: GridRowSelectionModel): string[] => {
        if (selectionModel.type === "exclude") {
            const excludedIds = new Set(Array.from(selectionModel.ids).map(Number));
            return ecoTaxaSamples
                .filter((sample) => !excludedIds.has(sample.sample_id))
                .map((sample) => sample.sample_name);
        }

        const selectedIds = new Set(Array.from(selectionModel.ids).map(Number));
        return ecoTaxaSamples
            .filter((sample) => selectedIds.has(sample.sample_id))
            .map((sample) => sample.sample_name);
    };

    const getSelectedCtdSampleNames = (selectionModel: GridRowSelectionModel): string[] => {
        if (selectionModel.type === "exclude") {
            const excludedNames = new Set(Array.from(selectionModel.ids).map(String));
            return ctdSamples
                .filter((sample) => !excludedNames.has(sample.sample_name))
                .map((sample) => sample.sample_name);
        }

        return Array.from(selectionModel.ids).map(String);
    };

    // UVP Samples State
    const [uvpSamples, setUvpSamples] = useState<SampleData[]>([]);
    const [totalUvpRows, setTotalUvpRows] = useState(0);
    const [loadingUvp, setLoadingUvp] = useState(false);
    const [selectedUvpSamples, setSelectedUvpSamples] = useState<GridRowSelectionModel>(createEmptySelectionModel());
    const [uvpPaginationModel, setUvpPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

    // EcoTaxa Samples State
    const [ecoTaxaSamples, setEcoTaxaSamples] = useState<EcoTaxaSampleData[]>([]);
    const [totalEcoTaxaRows, setTotalEcoTaxaRows] = useState(0);
    const [loadingEcoTaxa, setLoadingEcoTaxa] = useState(false);
    const [selectedEcoTaxaSamples, setSelectedEcoTaxaSamples] = useState<GridRowSelectionModel>(createEmptySelectionModel());
    const [ecoTaxaPaginationModel, setEcoTaxaPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

    // CTD Samples State
    const [ctdSamples, setCtdSamples] = useState<CtdSampleData[]>([]);
    const [totalCtdRows, setTotalCtdRows] = useState(0);
    const [loadingCtd, setLoadingCtd] = useState(false);
    const [selectedCtdSamples, setSelectedCtdSamples] = useState<GridRowSelectionModel>(createEmptySelectionModel());
    const [ctdPaginationModel, setCtdPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

    // Global Actions State
    const [isActionRunning, setIsActionRunning] = useState(false);

    // Notifications
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false, message: "", severity: "info",
    });

    // --- 2. DATA FETCHING ---

    const fetchUvpSamples = useCallback(async () => {
        setLoadingUvp(true);
        try {
            const response = await searchProjectSamples(projectId, {
                page: uvpPaginationModel.page + 1,
                limit: uvpPaginationModel.pageSize,
                filters: []
            });
            // MENTOR FIX: Read from response.samples instead of response.items
            setUvpSamples(response.samples || []);
            setTotalUvpRows(response.search_info?.total || 0);
        } catch (error) {
            console.error("Failed to load UVP samples", error);
        } finally {
            setLoadingUvp(false);
        }
    }, [projectId, uvpPaginationModel.page, uvpPaginationModel.pageSize]);

    const fetchEcoTaxaSamples = useCallback(async () => {
        setLoadingEcoTaxa(true);
        try {
            const response = await searchProjectEcoTaxaSamples(projectId, {
                page: ecoTaxaPaginationModel.page + 1,
                limit: ecoTaxaPaginationModel.pageSize,
                filters: []
            });
            // MENTOR FIX: Read from response.samples instead of response.items
            setEcoTaxaSamples(response.samples || []);
            setTotalEcoTaxaRows(response.search_info?.total || 0);
        } catch (error) {
            console.error("Failed to load EcoTaxa samples", error);
        } finally {
            setLoadingEcoTaxa(false);
        }
    }, [projectId, ecoTaxaPaginationModel.page, ecoTaxaPaginationModel.pageSize]);

    const fetchCtdSamples = useCallback(async () => {
        setLoadingCtd(true);
        try {
            const response = await searchProjectCtdSamples(projectId, {
                page: ctdPaginationModel.page + 1,
                limit: ctdPaginationModel.pageSize,
                filters: []
            });
            setCtdSamples(response.samples || []);
            setTotalCtdRows(response.search_info?.total || 0);
        } catch (error) {
            console.error("Failed to load CTD samples", error);
        } finally {
            setLoadingCtd(false);
        }
    }, [projectId, ctdPaginationModel.page, ctdPaginationModel.pageSize]);

    // Re-fetch when pagination changes
    useEffect(() => { fetchUvpSamples(); }, [fetchUvpSamples]);
    useEffect(() => { fetchEcoTaxaSamples(); }, [fetchEcoTaxaSamples]);
    useEffect(() => { fetchCtdSamples(); }, [fetchCtdSamples]);

    // --- 3. ACTIONS ---

    const showSnackbar = (message: string, severity: AlertColor = "info") => setSnackbar({ open: true, message, severity });
    const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const handleDeleteUvpSamples = async () => {
        const selectedIds = getSelectedUvpSampleIds(selectedUvpSamples);
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} UVP samples?`)) return;

        setIsActionRunning(true);
        try {
            await Promise.all(selectedIds.map(id => deleteProjectSample(projectId, id)));

            showSnackbar("UVP samples deleted successfully.", "success");
            setSelectedUvpSamples(createEmptySelectionModel());
            fetchUvpSamples();
        } catch (error) {
            console.error("Failed to delete UVP samples:", error);
            showSnackbar("An error occurred while deleting some UVP samples.", "error");
        } finally {
            setIsActionRunning(false);
        }
    };

    const handleDeleteEcoTaxaSamples = async () => {
        const selectedNames = getSelectedEcoTaxaSampleNames(selectedEcoTaxaSamples);
        if (selectedNames.length === 0) return;

        if (!window.confirm(`Are you sure you want to unlink ${selectedNames.length} EcoTaxa samples?`)) return;

        setIsActionRunning(true);
        try {
            await deleteProjectEcoTaxaSamples(projectId, selectedNames);
            showSnackbar("EcoTaxa samples removed successfully.", "success");
            setSelectedEcoTaxaSamples(createEmptySelectionModel());
            fetchEcoTaxaSamples();
        } catch (error) {
            console.error("Failed to delete EcoTaxa samples:", error);
            showSnackbar("An error occurred while removing EcoTaxa samples.", "error");
        } finally {
            setIsActionRunning(false);
        }
    };

    const handleDeleteCtdSamples = async () => {
        const selectedNames = getSelectedCtdSampleNames(selectedCtdSamples);

        if (selectedNames.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete ${selectedNames.length} CTD samples?`)) return;

        setIsActionRunning(true);
        try {
            await deleteProjectCtdSamples(projectId, selectedNames);
            showSnackbar("CTD samples removed successfully.", "success");
            setSelectedCtdSamples(createEmptySelectionModel());
            fetchCtdSamples();
        } catch (error) {
            console.error("Failed to delete CTD samples:", error);
            showSnackbar("An error occurred while removing CTD samples.", "error");
        } finally {
            setIsActionRunning(false);
        }
    };

    const handleMatchEcotaxa = () => {
        showSnackbar("Match EcoTaxa function coming soon.", "info");
    };

    return {
        uvpSamples, loadingUvp, totalUvpRows, uvpPaginationModel, setUvpPaginationModel,
        selectedUvpSamples, setSelectedUvpSamples, uvpSelectionCount: getSelectionCount(selectedUvpSamples, totalUvpRows),

        ecoTaxaSamples, loadingEcoTaxa, totalEcoTaxaRows, ecoTaxaPaginationModel, setEcoTaxaPaginationModel,
        selectedEcoTaxaSamples, setSelectedEcoTaxaSamples, ecoTaxaSelectionCount: getSelectionCount(selectedEcoTaxaSamples, totalEcoTaxaRows),

        ctdSamples, loadingCtd, totalCtdRows, ctdPaginationModel, setCtdPaginationModel,
        selectedCtdSamples, setSelectedCtdSamples, ctdSelectionCount: getSelectionCount(selectedCtdSamples, totalCtdRows),

        isActionRunning,
        handleDeleteUvpSamples, handleDeleteEcoTaxaSamples, handleDeleteCtdSamples, handleMatchEcotaxa,
        snackbar, closeSnackbar
    };
};
