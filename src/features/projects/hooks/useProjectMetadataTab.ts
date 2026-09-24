import { useState, useEffect, useCallback } from "react";
import type { AlertColor } from "@mui/material";

// Reuse the exact same types we use for creation to keep our Dumb Components happy
import type { NewProjectFormValues } from "../types/newProject.types";
import { getProjectById, updateProject, type Project, type PublicProjectUpdateModel } from "../api/projects.api";
import { extractErrorMessage } from "@/shared/utils/errorMessage";
import {
    type ProjectFormErrors,
    createEmptyProjectFormValues,
    mapProjectToFormValues,
    toNullableInt,
    validateProjectForm,
} from "../utils/projectForm";
import { usePeopleEmailCheck } from "./usePeopleEmailCheck";

interface EcoTaxaLinkedProject {
    projectId: number;
    projectName: string;
    instanceId: number | null;
}

/** The EcoTaxa project a backend project is linked to, or `null` when it has none. */
const toLinkedEcoTaxaProject = (project: Project): EcoTaxaLinkedProject | null =>
    project.ecotaxa_project_id
        ? {
            projectId: project.ecotaxa_project_id,
            projectName: project.ecotaxa_project_name || `EcoTaxa project ${project.ecotaxa_project_id}`,
            instanceId: project.ecotaxa_instance_id ?? null,
        }
        : null;

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

    // The backend project carries no account id for the people: resolve the
    // loaded (and later edited) emails so the section can show the icons.
    const checkingPeople = usePeopleEmailCheck(values.people, setValues);

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

                setLinkedEcoTaxaProject(toLinkedEcoTaxaProject(projectData));
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
            // The backend reads any EcoTaxa field as a link request (it requires an
            // EcoTaxa account and rejects an EcoTaxa project that is already linked,
            // this one included), so they are only sent when the link changes. A
            // project that stays linked sends none of them. The account is never
            // loaded from the backend, so a selected account means the user set up
            // a new link (or a creation) on a project that has none.
            const ecoTaxaAccountId = toNullableInt(values.ecoTaxa.account);
            const ecoTaxaProjectId = toNullableInt(values.ecoTaxa.project);
            const isNewEcoTaxaLink = !linkedEcoTaxaProject && ecoTaxaAccountId !== null;

            if (isNewEcoTaxaLink) {
                if (!values.ecoTaxa.createNewProject && ecoTaxaProjectId === null) {
                    // A null project id would be read as an unlink request.
                    showSnackbar("Select the EcoTaxa project to link, or choose to create a new one.", "warning");
                    return;
                }
                payload.ecotaxa_instance_id = toNullableInt(values.ecoTaxa.instance);
                payload.ecotaxa_account_id = ecoTaxaAccountId;
                if (values.ecoTaxa.createNewProject) {
                    payload.new_ecotaxa_project = true;
                } else {
                    payload.ecotaxa_project_id = ecoTaxaProjectId;
                }
            } else if (ecoTaxaUnlinkWarning) {
                // Unlink is represented by clearing only the EcoTaxa project reference.
                payload.ecotaxa_project_id = null;
            }

            const updatedProject = await updateProject(projectId, payload);

            if (isNewEcoTaxaLink) {
                // The backend resolves the linked (or freshly created) EcoTaxa project.
                setLinkedEcoTaxaProject(toLinkedEcoTaxaProject(updatedProject));
            } else if (ecoTaxaUnlinkWarning) {
                setLinkedEcoTaxaProject(null);
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
        checkingPeople,
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
