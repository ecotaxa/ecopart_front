import { useState, useEffect } from "react";
import { AlertColor } from "@mui/material";

// Reuse the exact same types we use for creation to keep our Dumb Components happy
import { NewProjectFormValues } from "../types/newProject.types";
import { getProjectById, updateProject, PublicProjectUpdateModel } from "../api/projects.api";
import { fetchActiveUsers, UserSearchResponse } from "@/features/auth/api/users.api";

/**
 * Narrow error shape used to safely extract backend validation messages
 * without using `any`.
 */
interface ApiErrorShape {
    message?: string;
    errors?: string[];
}

interface EcoTaxaLinkedProject {
    projectId: number;
    projectName: string;
    instanceId: number | null;
}

// We extend the update model locally to allow for the EcoTaxa creation flags 
// that the backend validation explicitly asks for, but which might be missing from the base type.
interface ExtendedProjectUpdateModel extends PublicProjectUpdateModel {
    new_ecotaxa_project?: boolean;
    ecotaxa_account_id?: number | null;
    ecotaxa_project_name?: string | null;
}

export const useProjectMetadataTab = (projectId: number) => {
    // --------------------------------------------------
    // 1. STATE
    // --------------------------------------------------
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<UserSearchResponse["users"]>([]);
    const [linkedEcoTaxaProject, setLinkedEcoTaxaProject] = useState<EcoTaxaLinkedProject | null>(null);
    const [ecoTaxaUnlinkWarning, setEcoTaxaUnlinkWarning] = useState(false);
    // Existing project title loaded from the backend. Once set, it acts as a
    // non-erasable prefix in the Project title field: the user may only append
    // text after it (same behaviour as the New Project form).
    const [lockedTitlePrefix, setLockedTitlePrefix] = useState("");

    // We initialize with empty values, they will be populated by the API
    const [values, setValues] = useState<NewProjectFormValues>({
        rootFolderPath: "",
        instrument: { model: "", serialNumber: "" },
        metadata: {
            title: "",
            acronym: "",
            ship: [],
            cruise: "",
            description: "",
            filteredBeforeImport: false,
            timeDurationCheck: true,
        },
        people: {
            dataOwnerName: "",
            dataOwnerEmail: "",
            chiefScientistName: "",
            chiefScientistEmail: "",
            operatorName: "",
            operatorEmail: "",
        },
        importSettings: { overrideDepthOffset: 0, enableDescentFilter: true },
        ecoTaxa: { instance: "", account: "", project: "", createNewProject: false },
        privileges: [],
        privacy: { privateMonths: 2, visibleMonths: 24, publicMonths: 36 },
        dataServer: { host: "", username: "", password: "", directory: "", vectorReference: "" },
    });

    const isRemoteProject = values.instrument.model.toLowerCase().includes("remote");

    // Notification State
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    const showSnackbar = (message: string, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

    // --------------------------------------------------
    // 2. DATA FETCHING (ON MOUNT)
    // --------------------------------------------------
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            try {
                // Fetch active users for the Privileges dropdown
                const usersResponse = await fetchActiveUsers();
                if (usersResponse?.users) {
                    setAvailableUsers(usersResponse.users);
                }

                // Fetch the Project Data
                const projectData = await getProjectById(projectId);

                // Lock the loaded title so it cannot be erased, only appended to.
                setLockedTitlePrefix(projectData.project_title || "");

                // --- MAP BACKEND DATA TO FRONTEND UI STATE ---
                setValues((prev) => ({
                    ...prev,
                    rootFolderPath: projectData.root_folder_path || "",
                    instrument: {
                        model: projectData.instrument_model || "",
                        serialNumber: projectData.serial_number || "",
                    },
                    metadata: {
                        title: projectData.project_title || "",
                        acronym: projectData.project_acronym || "",
                        // Ship comes as a comma-separated string from backend, convert to array for UI
                        ship: projectData.ship ? projectData.ship.split(",").map((s) => s.trim()) : [],
                        cruise: projectData.cruise || "",
                        description: projectData.project_description || "",
                        filteredBeforeImport: false, // Defaulting as it's not in DB yet
                        timeDurationCheck: true,
                    },
                    people: {
                        dataOwnerName: projectData.data_owner_name || "",
                        dataOwnerEmail: projectData.data_owner_email || "",
                        chiefScientistName: projectData.chief_scientist_name || "",
                        chiefScientistEmail: projectData.chief_scientist_email || "",
                        operatorName: projectData.operator_name || "",
                        operatorEmail: projectData.operator_email || "",
                    },
                    importSettings: {
                        overrideDepthOffset: projectData.override_depth_offset ?? 0,
                        enableDescentFilter: projectData.enable_descent_filter ?? true,
                    },
                    ecoTaxa: {
                        instance: projectData.ecotaxa_instance_id?.toString() || "",
                        // Note: Backend might not return the account ID, we leave it empty or map it if available
                        account: "",
                        project: projectData.ecotaxa_project_id?.toString() || "",
                        // Default to creating a new EcoTaxa project when none is linked
                        createNewProject: projectData.ecotaxa_project_id ? false : true,
                    },
                    privacy: {
                        privateMonths: projectData.privacy_duration ?? 2,
                        visibleMonths: projectData.visible_duration ?? 24,
                        publicMonths: projectData.public_duration ?? 36,
                    },
                    // Map privileges: Contact is radio, Managers/Members are rows
                    privileges: [
                        ...(projectData.managers || []).map((manager) => ({
                            userId: manager.user_id.toString(),
                            role: "Manager" as const,
                            contact: projectData.contact?.user_id === manager.user_id,
                        })),
                        ...(projectData.members || []).map((member) => ({
                            userId: member.user_id.toString(),
                            role: "Member" as const,
                            contact: projectData.contact?.user_id === member.user_id,
                        })),
                    ],
                }));

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
                console.error("Failed to load project details", error);
                showSnackbar("Failed to load project details.", "error");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [projectId]);

    // --------------------------------------------------
    // 3. FIELD UPDATER
    // --------------------------------------------------
    const updateField = <T extends keyof NewProjectFormValues>(
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
    };

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
    // 4. HELPERS
    // --------------------------------------------------
    const safeParseInt = (value: string, fallback: number = 1): number => {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? fallback : parsed;
    };

    const toNullableInt = (value: string | number | null | undefined): number | null => {
        if (value === undefined || value === null || value === "") {
            return null;
        }

        const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
        return Number.isNaN(parsed) ? null : parsed;
    };

    const extractErrorMessage = (error: unknown): string => {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === "object" && error !== null) {
            const apiError = error as ApiErrorShape;

            if (typeof apiError.message === "string" && apiError.message.trim() !== "") {
                return apiError.message;
            }

            if (Array.isArray(apiError.errors) && apiError.errors.length > 0) {
                return apiError.errors[0];
            }
        }

        return "An error occurred while saving.";
    };

    // --------------------------------------------------
    // 5. SAVE HANDLER (PATCH REQUEST)
    // --------------------------------------------------
    const handleSave = async () => {
        setSaving(true);

        try {
            const selectedContact = values.privileges.find((row) => row.contact === true);

            // IMPORTANT: do NOT shadow the route `projectId`.
            // The project being edited is the EcoPart project from the URL.
            // EcoTaxa project id is a different concept and must use another variable name.
            const payload: ExtendedProjectUpdateModel = {
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

                override_depth_offset:
                    typeof values.importSettings.overrideDepthOffset === "string"
                        ? Number.parseFloat(values.importSettings.overrideDepthOffset)
                        : values.importSettings.overrideDepthOffset,
                enable_descent_filter: values.importSettings.enableDescentFilter,

                privacy_duration: values.privacy.privateMonths,
                visible_duration: values.privacy.visibleMonths,
                public_duration: values.privacy.publicMonths,
            };

            // --- ECOTAXA HANDLING ---
            // Save sends the full metadata payload above.
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

            // Add privileges if they are managed here
            if (selectedContact) {
                payload.contact = { user_id: safeParseInt(selectedContact.userId) };

                payload.managers = values.privileges
                    .filter((row) => row.role === "Manager" && row.userId.trim() !== "")
                    .map((row) => ({ user_id: safeParseInt(row.userId) }));

                payload.members = values.privileges
                    .filter((row) => row.role === "Member" && row.userId.trim() !== "")
                    .map((row) => ({ user_id: safeParseInt(row.userId) }));
            }

            console.log("[ProjectMetadata] Route projectId:", projectId);
            console.log("[ProjectMetadata] PATCH Payload:", payload);

            // We cast to PublicProjectUpdateModel for the API client, but our payload 
            // is safely constructed without 'any' using our Extended interface.
            await updateProject(projectId, payload as PublicProjectUpdateModel);

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
            showSnackbar(extractErrorMessage(error), "error");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        window.history.back();
    };

    return {
        values,
        loading,
        saving,
        availableUsers,
        isRemoteProject,
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