import { useEffect, useState } from "react";
import { AlertColor } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { NewProjectFormValues } from "../types/newProject.types";
import { PublicProjectRequestCreationModel, createProject, getImportFolderMetadata } from "../api/projects.api";
import { fetchActiveUsers, UserSearchResponse } from "@/features/auth/api/users.api";
import { useAuthStore } from "@/features/auth/store/auth.store";


/**
 * Field-level errors used to display inline validation messages directly under inputs.
 * This is intentionally flat because it is easier to pass down to presentational components.
 */
export interface NewProjectFormErrors {
    rootFolderPath?: string;

    instrumentModel?: string;
    instrumentSerialNumber?: string;

    projectTitle?: string;
    projectAcronym?: string;
    ship?: string;
    cruise?: string;
    projectDescription?: string;

    dataOwnerName?: string;
    dataOwnerEmail?: string;
    chiefScientistName?: string;
    chiefScientistEmail?: string;
    operatorName?: string;
    operatorEmail?: string;

    ecoTaxaInstance?: string;
    ecoTaxaAccount?: string;
    ecoTaxaProject?: string;

    privilegesManager?: string;
    privilegesContact?: string;

    privateMonths?: string;
    visibleMonths?: string;
    publicMonths?: string;
}

/**
 * Backend validation item shape commonly returned by express-validator style APIs.
 */
interface BackendValidationItem {
    msg?: string;
}

/**
 * Backend error response shape.
 */
interface BackendErrorResponse {
    errors?: Array<string | BackendValidationItem>;
    message?: string;
}

/**
 * Type guard for a plain object.
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
};

/**
 * Type guard for backend error payloads.
 */
const isBackendErrorResponse = (value: unknown): value is BackendErrorResponse => {
    if (!isRecord(value)) return false;

    const maybeErrors = value["errors"];
    const maybeMessage = value["message"];

    const errorsOk =
        maybeErrors === undefined ||
        (Array.isArray(maybeErrors) &&
            maybeErrors.every(
                (item) =>
                    typeof item === "string" ||
                    (isRecord(item) && (item["msg"] === undefined || typeof item["msg"] === "string"))
            ));

    const messageOk = maybeMessage === undefined || typeof maybeMessage === "string";

    return errorsOk && messageOk;
};

/**
 * Safely extract a readable error message from any thrown value.
 */
const extractErrorMessage = (error: unknown): string => {
    // Add early return if error is undefined or null
    if (!error) return "An unexpected error occurred.";
    if (typeof error === "string") return error;

    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    if (isBackendErrorResponse(error)) {
        if (Array.isArray(error.errors) && error.errors.length > 0) {
            const firstError = error.errors[0];

            if (typeof firstError === "string") {
                return firstError;
            }

            if (typeof firstError.msg === "string" && firstError.msg.trim()) {
                return firstError.msg;
            }
        }

        if (typeof error.message === "string" && error.message.trim()) {
            return error.message;
        }
    }

    return "An unexpected error occurred while creating the project.";
};

/**
 * Maps a backend error message to the most relevant inline field error(s).
 * This lets us keep the raw backend message while also placing it near the correct UI area.
 */
const mapBackendErrorToFieldErrors = (message: string): Partial<NewProjectFormErrors> => {
    const lowered = message.toLowerCase();

    if (lowered.includes("manager")) {
        return { privilegesManager: message };
    }

    if (lowered.includes("contact")) {
        return { privilegesContact: message };
    }

    if (lowered.includes("ship")) {
        return { ship: message };
    }

    if (lowered.includes("ecotaxa") && lowered.includes("project")) {
        return { ecoTaxaProject: message };
    }

    if (lowered.includes("privacy") || lowered.includes("delay")) {
        return {
            privateMonths: message,
            visibleMonths: message,
            publicMonths: message,
        };
    }

    return {};
};

/**
 * Parse a positive integer from a string.
 * If the value is invalid or below 1, fallback to 1.
 */
const parsePositiveInt = (value: string | number): number => {
    // Safely handle if the value is already a number
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;

    if (Number.isNaN(parsed) || parsed < 1) {
        return 1;
    }

    return parsed;
};

/**
 * Parse a numeric select value to nullable integer.
 * Empty string returns null.
 */
const toNullableInt = (value: string | number | null | undefined): number | null => {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;
    return Number.isNaN(parsed) ? null : parsed;
};

export const useNewProjectForm = () => {
    // --------------------------------------------------
    // 1. INITIAL STATE
    // --------------------------------------------------
    const [values, setValues] = useState<NewProjectFormValues>({
        rootFolderPath: "",
        instrument: {
            model: "",
            serialNumber: "",
        },
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
            dataOwnerId: null as number | null,
            chiefScientistName: "",
            chiefScientistEmail: "",
            chiefScientistId: null as number | null,
            operatorName: "",
            operatorEmail: "",
            operatorId: null as number | null,
        },
        importSettings: {
            overrideDepthOffset: 0,
            enableDescentFilter: true,
        },
        ecoTaxa: {
            instance: "",
            account: "",
            project: "",
            createNewProject: false,
        },
        privileges: [],

        // Update default privacy duration delays (in months)
        privacy: {
            privateMonths: 2,   // Default delay until visible
            visibleMonths: 24,  // Default delay until public
            publicMonths: 36,   // Default delay until open
        },

        dataServer: {
            host: "",
            username: "",
            password: "",
            directory: "",
            vectorReference: "",
        },
    });

    // Initialise le hook de navigation
    const navigate = useNavigate();

    /**
     * Inline errors state used by the UI components.
     */
    const [errors, setErrors] = useState<NewProjectFormErrors>({});

    const [availableUsers, setAvailableUsers] = useState<UserSearchResponse["users"]>([]);
    const isRemoteProject = values.instrument.model.toLowerCase().includes("remote");

    // Current authenticated user used for privilege auto-fill
    const currentUser = useAuthStore((state) => state.user);

    // State to manage the MUI Snackbar (toast notifications)
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    // Helper function to easily trigger a notification
    const showSnackbar = (message: string, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    };

    const appendMetadataUsersToPrivileges = (metadata: {
        data_owner?: { ecopart_user_id?: number | null };
        operator?: { ecopart_user_id?: number | null };
        chief_scientist?: { ecopart_user_id?: number | null };
    }) => {
        const metadataIds = [
            metadata.data_owner?.ecopart_user_id,
            metadata.operator?.ecopart_user_id,
            metadata.chief_scientist?.ecopart_user_id,
        ].filter((id): id is number => typeof id === "number" && id > 0);

        if (metadataIds.length === 0) {
            return;
        }

        const uniqueMetadataIds = Array.from(new Set(metadataIds.map((id) => id.toString())));
        const existingEcoPartUserIds = new Set(availableUsers.map((user) => user.user_id.toString()));

        // If we already have the active EcoPart users list, only keep IDs that truly exist.
        // If the list is temporarily empty (still loading), keep metadata IDs to avoid losing members.
        const candidates =
            existingEcoPartUserIds.size > 0
                ? uniqueMetadataIds.filter((id) => existingEcoPartUserIds.has(id))
                : uniqueMetadataIds;

        if (candidates.length === 0) {
            return;
        }

        setValues((prev) => {
            const existingPrivilegeIds = new Set(prev.privileges.map((row) => row.userId));
            const rowsToAdd = candidates
                .filter((id) => !existingPrivilegeIds.has(id))
                .map((id) => ({
                    userId: id,
                    role: "Member" as const,
                    contact: false,
                }));

            if (rowsToAdd.length === 0) {
                return prev;
            }

            return {
                ...prev,
                privileges: [...prev.privileges, ...rowsToAdd],
            };
        });
    };

    // Function to close the notification (used by the UI)
    const closeSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    // --------------------------------------------------
    // 2. FETCH USERS ON MOUNT
    // --------------------------------------------------
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await fetchActiveUsers();
                if (response && response.users) {
                    setAvailableUsers(response.users);
                }
            } catch (error) {
                console.error("Failed to fetch users", error);
                showSnackbar("Failed to load users from the server.", "error");
            }
        };

        loadUsers();
    }, []);

    // --------------------------------------------------
    // 3. DYNAMIC FIELD UPDATER
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
                    [section]: {
                        ...(currentValue as object),
                        ...(data as object),
                    },
                };
            }

            return {
                ...prev,
                [section]: data as NewProjectFormValues[T],
            };
        });

        // Clear related errors when the user edits the corresponding section.
        setErrors((prev) => {
            const next = { ...prev };

            if (section === "rootFolderPath") {
                delete next.rootFolderPath;
            }

            if (section === "instrument") {
                delete next.instrumentModel;
                delete next.instrumentSerialNumber;
            }

            if (section === "metadata") {
                delete next.projectTitle;
                delete next.projectAcronym;
                delete next.ship;
                delete next.cruise;
                delete next.projectDescription;
            }

            if (section === "people") {
                delete next.dataOwnerName;
                delete next.dataOwnerEmail;
                delete next.chiefScientistName;
                delete next.chiefScientistEmail;
                delete next.operatorName;
                delete next.operatorEmail;
            }

            if (section === "ecoTaxa") {
                delete next.ecoTaxaInstance;
                delete next.ecoTaxaAccount;
                delete next.ecoTaxaProject;
            }

            if (section === "privileges") {
                delete next.privilegesManager;
                delete next.privilegesContact;
            }

            if (section === "privacy") {
                delete next.privateMonths;
                delete next.visibleMonths;
                delete next.publicMonths;
            }

            return next;
        });
    };

    // --------------------------------------------------
    // 4. METADATA PARSER
    // --------------------------------------------------
    const handleLoadMetadata = async () => {
        if (!values.rootFolderPath) {
            showSnackbar("Please select or enter a root folder path first.", "warning");
            setErrors((prev) => ({ ...prev, rootFolderPath: "Root folder path is required." }));
            return;
        }

        try {
            // FIX: We pass the raw string to the backend.
            const rawPath = values.rootFolderPath.trim();

            const apiMetadata = await getImportFolderMetadata(rawPath);

            // --- AUTO-FILL LOGIC ---

            if (apiMetadata.instrument_model || apiMetadata.serial_number) {
                updateField("instrument", {
                    model: apiMetadata.instrument_model || "",
                    serialNumber: apiMetadata.serial_number || "",
                });
            }

            // Extract the title safely handling both / and \
            const pathParts = rawPath.split(/[/\\]/);
            const folderName = pathParts[pathParts.length - 1];

            updateField("metadata", {
                title: folderName || apiMetadata.cruise || "",
                acronym: apiMetadata.project_acronym || "",
                cruise: apiMetadata.cruise || "",
                description: apiMetadata.project_description || "",
                ship: apiMetadata.ship ? [apiMetadata.ship] : [],
            });

            updateField("people", {
                dataOwnerName: apiMetadata.data_owner?.name || "",
                dataOwnerEmail: apiMetadata.data_owner?.email || "",
                dataOwnerId: apiMetadata.data_owner?.ecopart_user_id || null,

                operatorName: apiMetadata.operator?.name || "",
                operatorEmail: apiMetadata.operator?.email || "",
                operatorId: apiMetadata.operator?.ecopart_user_id || null,

                chiefScientistName: apiMetadata.chief_scientist?.name || "",
                chiefScientistEmail: apiMetadata.chief_scientist?.email || "",
                chiefScientistId: apiMetadata.chief_scientist?.ecopart_user_id || null,
            });

            appendMetadataUsersToPrivileges(apiMetadata);

            showSnackbar("Metadata successfully loaded and applied!", "success");

        } catch (error) {
            console.error("Metadata load failed", error);
            showSnackbar("Failed to load metadata. Check if the folder contains valid config/meta directories.", "error");
        }
    };

    // --------------------------------------------------
    // 5. VALIDATION LOGIC
    // --------------------------------------------------
    const validateForm = (): boolean => {
        const nextErrors: NewProjectFormErrors = {};

        // We trim() strings to prevent users from bypassing validation with whitespace.
        if (!values.rootFolderPath.trim()) nextErrors.rootFolderPath = "Root folder path is required.";

        if (!values.instrument.model.trim()) nextErrors.instrumentModel = "Instrument model is required.";
        if (!values.instrument.serialNumber.trim()) nextErrors.instrumentSerialNumber = "Instrument serial number is required.";

        if (!values.metadata.title.trim()) nextErrors.projectTitle = "Project title is required.";
        if (!values.metadata.acronym.trim()) nextErrors.projectAcronym = "Project acronym is required.";
        if (values.metadata.ship.length === 0) nextErrors.ship = "At least one ship must be selected.";
        if (!values.metadata.cruise.trim()) nextErrors.cruise = "Cruise is required.";
        if (!values.metadata.description.trim()) nextErrors.projectDescription = "Project description is required.";

        // Simple email regex for client-side validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Data Owner validation
        if (!values.people.dataOwnerName.trim()) {
            nextErrors.dataOwnerName = "Data owner name is required.";
        } else if (emailRegex.test(values.people.dataOwnerName.trim())) {
            // Warn if name field looks like an email (user likely swapped fields)
            nextErrors.dataOwnerName = "This looks like an email address. Please enter a name.";
        }
        if (!values.people.dataOwnerEmail.trim()) {
            nextErrors.dataOwnerEmail = "Data owner email is required.";
        } else if (!emailRegex.test(values.people.dataOwnerEmail.trim())) {
            nextErrors.dataOwnerEmail = "Please enter a valid email address.";
        }

        // Chief Scientist validation
        if (!values.people.chiefScientistName.trim()) {
            nextErrors.chiefScientistName = "Chief scientist name is required.";
        } else if (emailRegex.test(values.people.chiefScientistName.trim())) {
            nextErrors.chiefScientistName = "This looks like an email address. Please enter a name.";
        }
        if (!values.people.chiefScientistEmail.trim()) {
            nextErrors.chiefScientistEmail = "Chief scientist email is required.";
        } else if (!emailRegex.test(values.people.chiefScientistEmail.trim())) {
            nextErrors.chiefScientistEmail = "Please enter a valid email address.";
        }

        // Operator validation
        if (!values.people.operatorName.trim()) {
            nextErrors.operatorName = "Operator name is required.";
        } else if (emailRegex.test(values.people.operatorName.trim())) {
            nextErrors.operatorName = "This looks like an email address. Please enter a name.";
        }
        if (!values.people.operatorEmail.trim()) {
            nextErrors.operatorEmail = "Operator email is required.";
        } else if (!emailRegex.test(values.people.operatorEmail.trim())) {
            nextErrors.operatorEmail = "Please enter a valid email address.";
        }

        // EcoTaxa project is required only if we are NOT creating a new project.
        // if (!values.ecoTaxa.createNewProject && !values.ecoTaxa.project.trim()) {
        //     nextErrors.ecoTaxaProject = "EcoTaxa project is required.";
        // }

        // Privileges rules
        const hasManager = values.privileges.some((row) => row.role === "Manager");
        if (!hasManager) {
            nextErrors.privilegesManager = "At least one user must be a manager.";
        }

        const selectedContact = values.privileges.find((row) => row.contact === true);
        if (!selectedContact) {
            nextErrors.privilegesContact = "A contact is required.";
        } else if (!selectedContact.userId.trim()) {
            nextErrors.privilegesContact = "The contact must be linked to a valid user.";
        }

        // Delays must be at least 1 month
        if (values.privacy.privateMonths < 1) nextErrors.privateMonths = "Delay must be at least 1 month.";
        if (values.privacy.visibleMonths < 1) nextErrors.visibleMonths = "Delay must be at least 1 month.";
        if (values.privacy.publicMonths < 1) nextErrors.publicMonths = "Delay must be at least 1 month.";

        setErrors(nextErrors);

        const firstError = Object.values(nextErrors)[0];
        if (firstError) {
            showSnackbar(firstError, "warning");
            return false;
        }

        return true;
    };

    // --------------------------------------------------
    // 6. SUBMIT HANDLER
    // --------------------------------------------------
    const handleSubmit = async () => {
        try {
            if (!validateForm()) {
                return;
            }

            const selectedContact = values.privileges.find((row) => row.contact === true);
            if (!selectedContact) {
                return;
            }

            // Safely parse integers to prevent sending NaN to backend which causes 500 errors
            const safeParseInt = (val: string, fallback: number = 1): number => {
                const parsed = Number.parseInt(val, 10);
                return Number.isNaN(parsed) ? fallback : parsed;
            };

            // 1. Data Mapping: Transform Frontend state to Backend payload format
            // We build the object incrementally to avoid sending undefined values
            // which might break strict backend validation.
            const payload: Partial<PublicProjectRequestCreationModel> = {
                root_folder_path: values.rootFolderPath.trim(),
                project_title: values.metadata.title.trim(),
                project_acronym: values.metadata.acronym.trim(),
                project_description: values.metadata.description.trim(),
                project_information: "",
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

                override_depth_offset: typeof values.importSettings.overrideDepthOffset === 'string' ? parseFloat(values.importSettings.overrideDepthOffset) : values.importSettings.overrideDepthOffset,
                enable_descent_filter: values.importSettings.enableDescentFilter,

                privacy_duration: parsePositiveInt(values.privacy.privateMonths),
                visible_duration: parsePositiveInt(values.privacy.visibleMonths),
                public_duration: parsePositiveInt(values.privacy.publicMonths),

                // Strict privilege formatting matching your successful Postman structure
                contact: { user_id: safeParseInt(selectedContact.userId) },
                managers: values.privileges
                    .filter((row) => row.role === "Manager" && row.userId.trim() !== "")
                    .map((row) => ({ user_id: safeParseInt(row.userId) })),
                members: values.privileges
                    .filter((row) => row.role === "Member" && row.userId.trim() !== "")
                    .map((row) => ({ user_id: safeParseInt(row.userId) })),
            };

            // Only add ecotaxa fields if they actually exist to avoid sending nulls 
            // if the backend DB doesn't like them during creation.
            const instanceId = toNullableInt(values.ecoTaxa.instance);
            const accountId = toNullableInt(values.ecoTaxa.account);

            if (values.ecoTaxa.createNewProject) {
                payload.new_ecotaxa_project = true;
                if (instanceId) payload.ecotaxa_instance_id = instanceId;
                if (accountId) payload.ecotaxa_account_id = accountId;
            } else {
                const projectId = toNullableInt(values.ecoTaxa.project);
                if (projectId) payload.ecotaxa_project_id = projectId;
                if (instanceId) payload.ecotaxa_instance_id = instanceId;
                if (accountId) payload.ecotaxa_account_id = accountId;
            }

            // DEBUG: Log exactly what we are sending
            console.log("[NewProject] Payload being sent:", JSON.stringify(payload, null, 2));

            const createdProject = await createProject(payload as PublicProjectRequestCreationModel);

            showSnackbar("Project successfully created! Redirecting...", "success");

            setTimeout(() => {
                navigate(`/projects/${createdProject.project_id}`, { state: { activeTab: 3 } });
            }, 1500);
        } catch (error: unknown) {
            console.error("API Error during project creation:", error);

            const errorMessage = extractErrorMessage(error);
            const mappedErrors = mapBackendErrorToFieldErrors(errorMessage);

            setErrors((prev) => ({
                ...prev,
                ...mappedErrors,
            }));

            showSnackbar(errorMessage, "error");
        }
    };

    return {
        values,
        errors,
        updateField,
        handleSubmit,
        handleLoadMetadata,
        availableUsers,
        currentUser,
        isRemoteProject,
        snackbar,
        closeSnackbar,
    };
};