import { createElement, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AlertColor } from "@mui/material";
import type { GridRowSelectionModel, GridPaginationModel } from "@mui/x-data-grid";

import {
    searchProjectSamples,
    searchProjectEcoTaxaSamples,
    searchProjectCtdSamples,
    deleteProjectSamples,
    deleteProjectEcoTaxaSamples,
    deleteProjectCtdSamples,
    getProjectById,
    regenerateSamplePivots,
    isTaskCancelled,
    isTaskDone,
    waitForTask,
    type SampleData,
    type EcoTaxaSampleData,
    type CtdSampleData,
} from "../api/projects.api";
import { getEcoTaxaInstances } from "@/shared/api/ecotaxa.api";
import { buildEcoTaxaSampleUrl as buildSampleUrl } from "../utils/ecotaxaLinks";
import { confirmDialog } from "@/shared/confirm/confirm.store";
import { ConfirmWarningMessage } from "@/shared/components/ConfirmWarningMessage";
import { ALL_PAGE_SIZE, toRequestLimit } from "@/shared/utils/pageSizeOptions";
import { extractErrorMessage } from "@/shared/utils/errorMessage";

/**
 * 0-based index of the last page that holds rows. A page past it comes back
 * empty from the server, e.g. after deleting the only rows of the last page.
 */
const getLastPageIndex = (totalRows: number, pageSize: number): number =>
    pageSize === ALL_PAGE_SIZE || pageSize <= 0 ? 0 : Math.max(Math.ceil(totalRows / pageSize) - 1, 0);

export interface UseProjectDataTabOptions {
    /**
     * Load the EcoTaxa and CTD sample lists (and the EcoTaxa deep-link data).
     * Off for a user without privilege on the project: the backend refuses them.
     */
    withLinkedSamples?: boolean;
}

export const useProjectDataTab = (projectId: number, { withLinkedSamples = true }: UseProjectDataTabOptions = {}) => {
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
        const selectedEcoTaxaNames = new Set(Array.from(selectionModel.ids).map(String));

        if (selectionModel.type === "exclude") {
            return ecoTaxaSamples
                .filter((sample) => !selectedEcoTaxaNames.has(sample.sample_name))
                .map((sample) => sample.sample_name);
        }

        return ecoTaxaSamples
            .filter((sample) => selectedEcoTaxaNames.has(sample.sample_name))
            .map((sample) => sample.sample_name);
    };

    const getSelectedCtdSampleNames = (selectionModel: GridRowSelectionModel): string[] => {
        const selectedCtdNames = new Set(Array.from(selectionModel.ids).map(String));

        if (selectionModel.type === "exclude") {
            return ctdSamples
                .filter((sample) => !selectedCtdNames.has(sample.sample_name))
                .map((sample) => sample.sample_name);
        }

        return ctdSamples
            .filter((sample) => selectedCtdNames.has(sample.sample_name))
            .map((sample) => sample.sample_name);
    };

    const [uvpSamples, setUvpSamples] = useState<SampleData[]>([]);
    const [totalUvpRows, setTotalUvpRows] = useState(0);
    const [loadingUvp, setLoadingUvp] = useState(false);
    const [selectedUvpSamples, setSelectedUvpSamples] = useState<GridRowSelectionModel>(createEmptySelectionModel());
    const [uvpPaginationModel, setUvpPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

    const [ecoTaxaSamples, setEcoTaxaSamples] = useState<EcoTaxaSampleData[]>([]);
    const [totalEcoTaxaRows, setTotalEcoTaxaRows] = useState(0);
    const [loadingEcoTaxa, setLoadingEcoTaxa] = useState(false);
    const [selectedEcoTaxaSamples, setSelectedEcoTaxaSamples] = useState<GridRowSelectionModel>(createEmptySelectionModel());
    const [ecoTaxaPaginationModel, setEcoTaxaPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

    const [ctdSamples, setCtdSamples] = useState<CtdSampleData[]>([]);
    const [totalCtdRows, setTotalCtdRows] = useState(0);
    const [loadingCtd, setLoadingCtd] = useState(false);
    const [selectedCtdSamples, setSelectedCtdSamples] = useState<GridRowSelectionModel>(createEmptySelectionModel());
    const [ctdPaginationModel, setCtdPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

    // Per-section load error (null = no error). Lets the UI show a real error state
    // instead of a silent "No rows" when the backend fails (e.g. 500/401).
    const [uvpError, setUvpError] = useState<string | null>(null);
    const [ecoTaxaError, setEcoTaxaError] = useState<string | null>(null);
    const [ctdError, setCtdError] = useState<string | null>(null);

    // EcoTaxa deep-link data: the instance base URL (resolved from the project's
    // ecotaxa_instance_id) and the linked EcoTaxa project id. Both are needed to
    // build a per-sample EcoTaxa gallery URL; null until resolved (or if unlinked).
    const [ecoTaxaInstanceUrl, setEcoTaxaInstanceUrl] = useState<string | null>(null);
    const [ecoTaxaProjectId, setEcoTaxaProjectId] = useState<number | null>(null);

    const [isActionRunning, setIsActionRunning] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: ReactNode; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    // One counter per list: a response is applied only if it belongs to the latest
    // request, so paging quickly (or a delete's refetch) can never show stale rows.
    const uvpRequestId = useRef(0);
    const ecoTaxaRequestId = useRef(0);
    const ctdRequestId = useRef(0);

    const fetchUvpSamples = useCallback(async () => {
        const requestId = ++uvpRequestId.current;
        const isLatest = () => requestId === uvpRequestId.current;
        let steppedBack = false;
        setLoadingUvp(true);
        setUvpError(null);
        try {
            const response = await searchProjectSamples(projectId, {
                page: uvpPaginationModel.page + 1,
                limit: toRequestLimit(uvpPaginationModel.pageSize),
                filters: [],
            });
            if (!isLatest()) return;
            const samples = response.samples || [];
            const total = response.search_info?.total || 0;
            const lastPage = getLastPageIndex(total, uvpPaginationModel.pageSize);
            if (samples.length === 0 && uvpPaginationModel.page > lastPage) {
                // This page emptied (its last rows were deleted): step back to the last
                // non-empty page instead of showing the empty state. The page change
                // triggers the next fetch, so the loading state is kept until then.
                steppedBack = true;
                setUvpPaginationModel((prev) => ({ ...prev, page: lastPage }));
                return;
            }
            setUvpSamples(samples);
            setTotalUvpRows(total);
        } catch (error) {
            if (!isLatest()) return;
            console.error("Failed to load UVP samples", error);
            setUvpSamples([]);
            setTotalUvpRows(0);
            setUvpError(error instanceof Error ? error.message : "Unknown error");
        } finally {
            if (isLatest() && !steppedBack) setLoadingUvp(false);
        }
    }, [projectId, uvpPaginationModel.page, uvpPaginationModel.pageSize]);

    const fetchEcoTaxaSamples = useCallback(async () => {
        const requestId = ++ecoTaxaRequestId.current;
        const isLatest = () => requestId === ecoTaxaRequestId.current;
        let steppedBack = false;
        setLoadingEcoTaxa(true);
        setEcoTaxaError(null);
        try {
            const response = await searchProjectEcoTaxaSamples(projectId, {
                page: ecoTaxaPaginationModel.page + 1,
                limit: toRequestLimit(ecoTaxaPaginationModel.pageSize),
                filters: [],
            });
            if (!isLatest()) return;
            const samples = response.samples || [];
            const total = response.search_info?.total || 0;
            const lastPage = getLastPageIndex(total, ecoTaxaPaginationModel.pageSize);
            if (samples.length === 0 && ecoTaxaPaginationModel.page > lastPage) {
                // Same step back as the UVP list.
                steppedBack = true;
                setEcoTaxaPaginationModel((prev) => ({ ...prev, page: lastPage }));
                return;
            }
            setEcoTaxaSamples(samples);
            setTotalEcoTaxaRows(total);
        } catch (error) {
            if (!isLatest()) return;
            console.error("Failed to load EcoTaxa samples", error);
            setEcoTaxaSamples([]);
            setTotalEcoTaxaRows(0);
            setEcoTaxaError(error instanceof Error ? error.message : "Unknown error");
        } finally {
            if (isLatest() && !steppedBack) setLoadingEcoTaxa(false);
        }
    }, [projectId, ecoTaxaPaginationModel.page, ecoTaxaPaginationModel.pageSize]);

    const fetchCtdSamples = useCallback(async () => {
        const requestId = ++ctdRequestId.current;
        const isLatest = () => requestId === ctdRequestId.current;
        setLoadingCtd(true);
        setCtdError(null);
        try {
            // GET /ctd_samples is not paginated server-side: it returns every imported
            // CTD sample in a single response. We fetch once and paginate client-side in
            // the grid (the page/limit below are ignored by the backend).
            const response = await searchProjectCtdSamples(projectId, {
                page: 1,
                limit: 0,
                filters: [],
            });
            if (!isLatest()) return;
            setCtdSamples(response.samples || []);
            setTotalCtdRows(response.search_info?.total || 0);
        } catch (error) {
            if (!isLatest()) return;
            console.error("Failed to load CTD samples", error);
            setCtdSamples([]);
            setTotalCtdRows(0);
            setCtdError(error instanceof Error ? error.message : "Unknown error");
        } finally {
            if (isLatest()) setLoadingCtd(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchUvpSamples();
    }, [fetchUvpSamples]);

    useEffect(() => {
        if (withLinkedSamples) fetchEcoTaxaSamples();
    }, [fetchEcoTaxaSamples, withLinkedSamples]);

    useEffect(() => {
        if (withLinkedSamples) fetchCtdSamples();
    }, [fetchCtdSamples, withLinkedSamples]);

    // Resolve the EcoTaxa instance URL + linked project id so EcoTaxa sample rows
    // can deep-link into the right EcoTaxa instance. Failures are non-fatal: the
    // rows simply stay non-clickable instead of breaking the whole tab.
    useEffect(() => {
        if (!withLinkedSamples) return;
        let active = true;

        (async () => {
            try {
                const project = await getProjectById(projectId);
                if (!active) return;

                setEcoTaxaProjectId(project.ecotaxa_project_id ?? null);

                if (project.ecotaxa_instance_id == null) return;

                const instances = await getEcoTaxaInstances();
                if (!active) return;

                const instance = instances.find(
                    (inst) => inst.ecotaxa_instance_id === project.ecotaxa_instance_id,
                );
                setEcoTaxaInstanceUrl(instance?.ecotaxa_instance_url ?? null);
            } catch (error) {
                console.error("Failed to resolve EcoTaxa instance URL", error);
            }
        })();

        return () => {
            active = false;
        };
    }, [projectId, withLinkedSamples]);

    // Builds the EcoTaxa gallery URL for one sample (instance + project + sample
    // filter). Returns null when the project is not linked to EcoTaxa yet.
    const buildEcoTaxaSampleUrl = (sample: EcoTaxaSampleData): string | null =>
        buildSampleUrl(ecoTaxaInstanceUrl, ecoTaxaProjectId, sample.ecotaxa_sample_id);

    const showSnackbar = (message: ReactNode, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const handleDeleteUvpSamples = async () => {
        const selectedIds = getSelectedUvpSampleIds(selectedUvpSamples);
        if (selectedIds.length === 0) return;

        if (!(await confirmDialog({
            title: "Delete UVP samples",
            message: createElement(ConfirmWarningMessage, null,
                `This deletes ${selectedIds.length} sample(s) and their imported particle and image data from this project, ` +
                `as well as the associated EcoTaxa sample(s). This cannot be undone.`),
            confirmLabel: "Delete",
        }))) return;

        setIsActionRunning(true);
        try {
            // One task deletes the whole selection, one sample after the other; a failing sample does
            // not stop the others. The samples exist until the task is DONE, so the tab waits for it.
            const task = await deleteProjectSamples(projectId, selectedIds);
            showSnackbar(`Deleting ${selectedIds.length} UVP sample(s) (task #${task.task_id})...`, "info");
            const finished = await waitForTask(task.task_id);

            if (isTaskDone(finished.task_status)) {
                showSnackbar(`${selectedIds.length} UVP sample(s) deleted (task #${task.task_id}).`, "success");
                setSelectedUvpSamples(createEmptySelectionModel());
            } else if (isTaskCancelled(finished.task_status)) {
                showSnackbar(`Deletion task #${task.task_id} was cancelled: the remaining samples are kept.`, "warning");
            } else {
                // The task error lists the samples that could not be deleted; they stay selected for a retry.
                console.error("Failed to delete UVP samples:", finished.task_error);
                showSnackbar(`Failed to delete UVP samples (task #${task.task_id}): ${finished.task_error ?? "see the task log"}`, "error");
            }
        } catch (error) {
            console.error("Failed to delete UVP samples:", error);
            showSnackbar(`Failed to delete UVP samples: ${error instanceof Error ? error.message : "unknown error"}`, "error");
        } finally {
            fetchUvpSamples();
            setIsActionRunning(false);
        }
    };

    // Rebuilds the UVP6 pivot of the selected UVP5 samples, or of every sample when none is
    // selected. Forced: a pivot already at the current converter version is rebuilt too.
    const handleRegeneratePivots = async () => {
        const selectedIds = new Set(getSelectedUvpSampleIds(selectedUvpSamples));
        const sampleNames = uvpSamples.filter((sample) => selectedIds.has(sample.sample_id)).map((sample) => sample.sample_name);
        const scope = sampleNames.length > 0 ? `${sampleNames.length} selected sample(s)` : "every sample of this project";

        if (!(await confirmDialog({
            title: "Regenerate pivots",
            message: `This rebuilds the particle pivot of ${scope} from their raw UVP5 data, in a background task.`,
            confirmLabel: "Regenerate",
        }))) return;

        setIsActionRunning(true);
        try {
            const task = await regenerateSamplePivots(projectId, { sample_names: sampleNames, force: true });
            showSnackbar(createElement("span", null,
                "Pivot regeneration task ",
                createElement(Link, { to: `/projects/${projectId}/tasks/${task.task_id}`, style: { color: "inherit", fontWeight: "bold", textDecoration: "underline" } }, `#${task.task_id}`),
                " started. You can check its progress in the TASKS tab."), "success");
        } catch (error) {
            console.error("Failed to start pivot regeneration:", error);
            showSnackbar(extractErrorMessage(error, "Failed to start pivot regeneration."), "error");
        } finally {
            setIsActionRunning(false);
        }
    };

    const handleDeleteEcoTaxaSamples = async () => {
        const selectedNames = getSelectedEcoTaxaSampleNames(selectedEcoTaxaSamples);
        if (selectedNames.length === 0) return;

        if (!(await confirmDialog({
            title: "Delete samples from EcoTaxa",
            message: `This removes ${selectedNames.length} sample(s) from the linked EcoTaxa project — an external system, not only from EcoPart. ` +
                `This cannot be undone.`,
            confirmLabel: "Delete",
        }))) return;

        setIsActionRunning(true);
        try {
            await deleteProjectEcoTaxaSamples(projectId, selectedNames);
            showSnackbar("Samples deleted from EcoTaxa successfully.", "success");
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

        if (!(await confirmDialog({
            title: "Delete CTD samples",
            message: `This removes the CTD file linked to ${selectedNames.length} sample(s); the samples themselves are kept. ` +
                `This cannot be undone.`,
            confirmLabel: "Delete",
        }))) return;

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

    return {
        uvpSamples,
        loadingUvp,
        totalUvpRows,
        uvpPaginationModel,
        setUvpPaginationModel,
        selectedUvpSamples,
        setSelectedUvpSamples,
        ecoTaxaSamples,
        loadingEcoTaxa,
        totalEcoTaxaRows,
        ecoTaxaPaginationModel,
        setEcoTaxaPaginationModel,
        selectedEcoTaxaSamples,
        setSelectedEcoTaxaSamples,
        ctdSamples,
        loadingCtd,
        totalCtdRows,
        ctdPaginationModel,
        setCtdPaginationModel,
        selectedCtdSamples,
        setSelectedCtdSamples,
        uvpSelectionCount: getSelectionCount(selectedUvpSamples, totalUvpRows),
        ecoTaxaSelectionCount: getSelectionCount(selectedEcoTaxaSamples, totalEcoTaxaRows),
        ctdSelectionCount: getSelectionCount(selectedCtdSamples, totalCtdRows),
        uvpError,
        ecoTaxaError,
        ctdError,
        isActionRunning,
        handleDeleteUvpSamples,
        handleDeleteEcoTaxaSamples,
        handleDeleteCtdSamples,
        handleRegeneratePivots,
        buildEcoTaxaSampleUrl,
        snackbar,
        closeSnackbar,
    };
};
