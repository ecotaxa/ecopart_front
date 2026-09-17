import { useState, useEffect, useCallback } from "react";
import type { AlertColor } from "@mui/material";

// Reuse the exact same types we use for creation to keep our Dumb Components happy
import type { NewProjectFormValues } from "../types/newProject.types";
import { getProjectById, updateProject, type PublicProjectUpdateModel } from "../api/projects.api";
import { extractErrorMessage } from "@/shared/utils/errorMessage";
import {
    type ProjectFormErrors,
    createEmptyProjectFormValues,
    mapProjectToFormValues,
    toNullableInt,
    validateProjectForm,
} from "../utils/projectForm";

interface EcoTaxaLinkedProject {
    projectId: number;
    projectName: string;
    instanceId: number | null;
}

export const useProjectMetadataTab = (projectId: number) => {
    // --------------------------------------------------
    // 1. STATE
    // --------------------------------------------------
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<ProjectFormErrors>({});
    const [linkedEcoTaxaProject, setLinkedEcoTaxaProject] = useState<EcoTaxaLinkedProject | null>(null);
    const [ecoTaxaUnlinkWarning, setEcoTaxaUnlinkWarning] = useState(false);
    // Existing project title loaded from the backend. Once set, it acts as a
    // non-erasable prefix in the Project title field: the user may only append
    // text after it (same behaviour as the New Project form).
    const [lockedTitlePrefix, setLockedTitlePrefix] = useState("");

    // We initialize with empty values, they will be populated by the API
    const [values, setValues] = useState<NewProjectFormValues>(createEmptyProjectFormValues);

    // Notification State
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    const showSnackbar = useCallback((message: string, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const closeSnackbar = useCallback(() => setSnackbar((prev) => ({ ...prev, open: false })), []);

    // --------------------------------------------------
    // 2. DATA FETCHING (ON MOUNT / PROJECT CHANGE)
    // --------------------------------------------------
    useEffect(() => {
        // Ignore the response of a superseded load (project id changed / unmount).
        let cancelled = false;

        const loadData = async () => {
            setLoading(true);

            try {
                const projectData = await getProjectById(projectId);
                if (cancelled) return;

                // Lock the loaded title so it cannot be erased, only appended to.
                setLockedTitlePrefix(projectData.project_title || "");
                setValues(mapProjectToFormValues(projectData));
                setErrors({});

                if (projectData.ecotaxa_project_id) {
                    setLinkedEcoTaxaProject({
                        projectId: projectData.ecotaxa_project_id,
                        projectName: projectData.ecotaxa_project_name || `EcoTaxa project ${projectData.ecotaxa_project_id}`,
                        instanceId: projectData.ecotaxa_instance_id ?? null,
                    });
                } else {
                    setLinkedEcoTaxaProject(null);
                }

                setEcoTaxaUnlinkWarning(false);
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to load project details", error);
                showSnackbar("Failed to load project details.", "error");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadData();
        return () => { cancelled = true; };
    }, [projectId, showSnackbar]);

    // --------------------------------------------------
    // 3. FIELD UPDATER
    // --------------------------------------------------
    // Stable identity (only state setters inside) so child sections can safely
    // depend on it without re-running their effects on every parent render.
    const updateField = useCallback(<T extends keyof NewProjectFormValues>(
        section: T,
        data: Partial<NewProjectFormValues[T]> | NewProjectFormValues[T]
    ) => {
        setValues((prev) => {
            const currentValue = prev[section];

            if (typeof currentValue === "object" && !Array.isArray(currentValue) && currentValue !== null) {
                return {
                    ...prev,
                    [section]: { ...(currentValue as object), ...(data as object) },
                };
            }

            return {
                ...prev,
                [section]: data as NewProjectFormValues[T],
            };
        });
    }, []);

    const handleUnlinkEcoTaxaProject = () => {
        setLinkedEcoTaxaProject(null);
        setEcoTaxaUnlinkWarning(true);

        updateField("ecoTaxa", {
            instance: "",
            account: "",
            project: "",
            createNewProject: false,
        });
    };

    // --------------------------------------------------
    // 4. SAVE HANDLER (PATCH REQUEST)
    // --------------------------------------------------
    const handleSave = async () => {
        if (saving) return;

        // Same rules as project creation, restricted to what this tab edits
        // (privileges and privacy delays live on the SECURITY tab).
        const nextErrors = validateProjectForm(values, { metadata: true });
        setErrors(nextErrors);
        const firstError = Object.values(nextErrors)[0];
        if (firstError) {
            showSnackbar(firstError, "warning");
            return;
        }

        setSaving(true);

        try {
            // IMPORTANT: do NOT shadow the route `projectId`.
            // The project being edited is the EcoPart project from the URL.
            // EcoTaxa project id is a different concept and must use another variable name.
            //
            // Only the fields edited on this tab are sent: privileges and privacy
            // delays are owned by the SECURITY tab, so a metadata save can never
            // overwrite them with a stale copy.
            const payload: PublicProjectUpdateModel = {
                root_folder_path: values.rootFolderPath.trim(),
                project_title: values.metadata.title.trim(),
                project_acronym: values.metadata.acronym.trim(),
                project_description: values.metadata.description.trim(),
                cruise: values.metadata.cruise.trim(),
                ship: values.metadata.ship.join(", "),

                data_owner_name: values.people.dataOwnerName.trim(),
                data_owner_email: values.people.dataOwnerEmail.trim(),
                operator_name: values.people.operatorName.trim(),
                operator_email: values.people.operatorEmail.trim(),
                chief_scientist_name: values.people.chiefScientistName.trim(),
                chief_scientist_email: values.people.chiefScientistEmail.trim(),

                instrument_model: values.instrument.model,
                serial_number: values.instrument.serialNumber.trim(),

                override_depth_offset: values.importSettings.overrideDepthOffset,
                enable_descent_filter: values.importSettings.enableDescentFilter,
            };

            // --- ECOTAXA HANDLING ---
            // Unlink is represented by clearing only the EcoTaxa project reference.
            const ecoTaxaInstanceId = toNullableInt(values.ecoTaxa.instance);
            const ecoTaxaAccountId = toNullableInt(values.ecoTaxa.account);
            const ecoTaxaProjectId = toNullableInt(values.ecoTaxa.project);
            const hasEcoTaxaValues = ecoTaxaInstanceId !== null || ecoTaxaAccountId !== null || ecoTaxaProjectId !== null;

            if (ecoTaxaUnlinkWarning && linkedEcoTaxaProject === null && !hasEcoTaxaValues) {
                payload.ecotaxa_project_id = null;
            } else if (linkedEcoTaxaProject || hasEcoTaxaValues) {
                payload.ecotaxa_instance_id = ecoTaxaInstanceId;
                payload.ecotaxa_account_id = ecoTaxaAccountId;

                if (ecoTaxaProjectId !== null) {
                    payload.ecotaxa_project_id = ecoTaxaProjectId;
                    // Only set name if we actually have it from the linked project
                    // Don't fall back to values.ecoTaxa.project which is an ID, not a name
                    payload.ecotaxa_project_name = linkedEcoTaxaProject?.projectName || null;
                }

                payload.new_ecotaxa_project = linkedEcoTaxaProject ? false : values.ecoTaxa.createNewProject;
            }

            await updateProject(projectId, payload);

            if (linkedEcoTaxaProject && ecoTaxaProjectId !== null) {
                setLinkedEcoTaxaProject({
                    projectId: ecoTaxaProjectId,
                    projectName: payload.ecotaxa_project_name || linkedEcoTaxaProject.projectName,
                    instanceId: ecoTaxaInstanceId,
                });
            } else if (ecoTaxaUnlinkWarning && !hasEcoTaxaValues) {
                setLinkedEcoTaxaProject(null);
                // After a successful unlink+save, prepare the form to allow creating a new EcoTaxa project
                // and show the toggle checked when the user returns to the UI.
                updateField("ecoTaxa", { createNewProject: true });
            }

            setEcoTaxaUnlinkWarning(false);

            showSnackbar("Project updated successfully!", "success");
        } catch (error: unknown) {
            console.error("Failed to update project", error);
            showSnackbar(extractErrorMessage(error, "An error occurred while saving."), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        window.history.back();
    };

    return {
        values,
        errors,
        loading,
        saving,
        lockedTitlePrefix,
        updateField,
        linkedEcoTaxaProject,
        ecoTaxaUnlinkWarning,
        handleUnlinkEcoTaxaProject,
        handleSave,
        handleCancel,
        snackbar,
        closeSnackbar,
    };
};
