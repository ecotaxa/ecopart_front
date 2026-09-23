import { useCallback, useEffect, useRef, useState } from "react";
import type { AlertColor } from "@mui/material";
import { useNavigate } from "react-router-dom";

import type { NewProjectFormValues } from "../types/newProject.types";
import { type PublicProjectRequestCreationModel, createProject, getImportFolderMetadata } from "../api/projects.api";
import { fetchActiveUsers, type UserSearchResponse } from "@/features/auth/api/users.api";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { extractErrorMessage } from "@/shared/utils/errorMessage";
import {
    type ProjectFormErrors,
    buildPrivilegesPayload,
    createEmptyProjectFormValues,
    mapBackendErrorToFieldErrors,
    parsePositiveInt,
    toNullableInt,
    validateProjectForm,
} from "../utils/projectForm";
import { usePeopleEmailCheck } from "./usePeopleEmailCheck";

/**
 * Field-level errors used to display inline validation messages directly under inputs.
 * This is intentionally flat because it is easier to pass down to presentational components.
 */
export type NewProjectFormErrors = ProjectFormErrors;

/** The error keys each form section owns — editing a section clears them. */
const SECTION_ERROR_KEYS: Record<keyof NewProjectFormValues, (keyof ProjectFormErrors)[]> = {
    rootFolderPath: ["rootFolderPath"],
    instrument: ["instrumentModel", "instrumentSerialNumber"],
    metadata: ["projectTitle", "projectAcronym", "ship", "cruise", "projectDescription"],
    people: ["dataOwnerName", "dataOwnerEmail", "chiefScientistName", "chiefScientistEmail", "operatorName", "operatorEmail"],
    importSettings: [],
    ecoTaxa: ["ecoTaxaInstance", "ecoTaxaAccount", "ecoTaxaProject"],
    privileges: ["privilegesManager", "privilegesContact"],
    privacy: ["privateMonths", "visibleMonths", "publicMonths"],
};

/** Delay before leaving the page after a successful creation, so the success toast is readable. */
const REDIRECT_DELAY_MS = 1500;

export const useNewProjectForm = () => {
    // --------------------------------------------------
    // 1. INITIAL STATE
    // --------------------------------------------------
    const [values, setValues] = useState<NewProjectFormValues>(createEmptyProjectFormValues);

    // Resolve typed / loaded emails to EcoPart accounts for the People section icons.
    const checkingPeople = usePeopleEmailCheck(values.people, setValues);

    const navigate = useNavigate();

    /**
     * Inline errors state used by the UI components.
     */
    const [errors, setErrors] = useState<NewProjectFormErrors>({});

    const [availableUsers, setAvailableUsers] = useState<UserSearchResponse["users"]>([]);
    const [availableUsersLoaded, setAvailableUsersLoaded] = useState(false);
    // Title loaded from the import folder. Once set, it acts as a non-erasable
    // prefix in the Project title field: the user may only append text after it.
    const [lockedTitlePrefix, setLockedTitlePrefix] = useState("");
    const [pendingMetadataPrivilegeIds, setPendingMetadataPrivilegeIds] = useState<number[] | null>(null);

    // Current authenticated user used for privilege auto-fill
    const currentUser = useAuthStore((state) => state.user);

    // State to manage the MUI Snackbar (toast notifications)
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    // State to track project creation progress
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    // The post-creation redirect timer, cleared if the page unmounts first.
    const redirectTimer = useRef<number | null>(null);
    useEffect(() => () => {
        if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
    }, []);

    // Helper function to easily trigger a notification
    const showSnackbar = useCallback((message: string, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    }, []);

    // Function to close the notification (used by the UI)
    const closeSnackbar = useCallback(() => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    }, []);

    const appendMetadataUsersToPrivileges = useCallback((metadataUserIds: number[]) => {
        if (metadataUserIds.length === 0) {
            return;
        }

        const uniqueMetadataIds = Array.from(new Set(metadataUserIds.map((id) => id.toString())));
        const existingEcoPartUserIds = new Set(availableUsers.map((user) => user.user_id.toString()));

        if (existingEcoPartUserIds.size === 0) {
            return;
        }

        const candidates = uniqueMetadataIds.filter((id) => existingEcoPartUserIds.has(id));

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
    }, [availableUsers]);

    const queueOrAppendMetadataUsersToPrivileges = (metadataUserIds: number[]) => {
        if (metadataUserIds.length === 0) {
            return;
        }

        if (!availableUsersLoaded) {
            setPendingMetadataPrivilegeIds(metadataUserIds);
            return;
        }

        appendMetadataUsersToPrivileges(metadataUserIds);
    };

    const extractMetadataUserIds = (metadata: {
        data_owner?: { ecopart_user_id?: number | null };
        operator?: { ecopart_user_id?: number | null };
        chief_scientist?: { ecopart_user_id?: number | null };
    }) => {
        return [
            metadata.data_owner?.ecopart_user_id,
            metadata.operator?.ecopart_user_id,
            metadata.chief_scientist?.ecopart_user_id,
        ].filter((id): id is number => typeof id === "number" && id > 0);
    };

    // --------------------------------------------------
    // 2. FETCH USERS ON MOUNT
    // --------------------------------------------------
    useEffect(() => {
        let cancelled = false;

        const loadUsers = async () => {
            try {
                const response = await fetchActiveUsers();
                if (!cancelled && response && response.users) {
                    setAvailableUsers(response.users);
                }
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to fetch users", error);
                showSnackbar("Failed to load users from the server.", "error");
            } finally {
                if (!cancelled) setAvailableUsersLoaded(true);
            }
        };

        loadUsers();
        return () => { cancelled = true; };
    }, [showSnackbar]);

    useEffect(() => {
        if (!availableUsersLoaded || pendingMetadataPrivilegeIds === null) {
            return;
        }

        appendMetadataUsersToPrivileges(pendingMetadataPrivilegeIds);
        setPendingMetadataPrivilegeIds(null);
    }, [availableUsersLoaded, pendingMetadataPrivilegeIds, appendMetadataUsersToPrivileges]);

    // --------------------------------------------------
    // 3. DYNAMIC FIELD UPDATER
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
        const keysToClear = SECTION_ERROR_KEYS[section];
        if (keysToClear.length > 0) {
            setErrors((prev) => {
                const next = { ...prev };
                for (const key of keysToClear) delete next[key];
                return next;
            });
        }
    }, []);

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
            //  We pass the raw string to the backend.
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

            const loadedTitle = folderName || apiMetadata.cruise || "";
            // Lock the loaded title so it cannot be erased, only appended to.
            setLockedTitlePrefix(loadedTitle);

            updateField("metadata", {
                title: loadedTitle,
                acronym: apiMetadata.project_acronym || "",
                cruise: apiMetadata.cruise || "",
                description: apiMetadata.project_description || "",
                ship: apiMetadata.ship ? [apiMetadata.ship] : [],
            });

            // The backend resolves each email to an account id while reading the
            // folder. A miss is left unresolved (undefined) so usePeopleEmailCheck
            // retries it case-insensitively before showing "not registered".
            updateField("people", {
                dataOwnerName: apiMetadata.data_owner?.name || "",
                dataOwnerEmail: apiMetadata.data_owner?.email || "",
                dataOwnerId: apiMetadata.data_owner?.ecopart_user_id || undefined,

                operatorName: apiMetadata.operator?.name || "",
                operatorEmail: apiMetadata.operator?.email || "",
                operatorId: apiMetadata.operator?.ecopart_user_id || undefined,

                chiefScientistName: apiMetadata.chief_scientist?.name || "",
                chiefScientistEmail: apiMetadata.chief_scientist?.email || "",
                chiefScientistId: apiMetadata.chief_scientist?.ecopart_user_id || undefined,
            });

            queueOrAppendMetadataUsersToPrivileges(extractMetadataUserIds(apiMetadata));

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
        const nextErrors = validateProjectForm(values);
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
        if (isSubmitting || isRedirecting) return;
        setIsSubmitting(true);
        try {
            if (!validateForm()) {
                return;
            }

            const { contact, managers, members } = buildPrivilegesPayload(values.privileges);
            if (!contact) {
                // Unreachable after validateForm(), kept as a type guard.
                return;
            }

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

                override_depth_offset: values.importSettings.overrideDepthOffset,
                enable_descent_filter: values.importSettings.enableDescentFilter,

                privacy_duration: parsePositiveInt(values.privacy.privateMonths),
                visible_duration: parsePositiveInt(values.privacy.visibleMonths),
                public_duration: parsePositiveInt(values.privacy.publicMonths),

                contact,
                managers,
                members,
            };

            // Only add ecotaxa fields if they actually exist to avoid sending nulls
            // if the backend DB doesn't like them during creation.
            const instanceId = toNullableInt(values.ecoTaxa.instance);
            const accountId = toNullableInt(values.ecoTaxa.account);

            if (values.ecoTaxa.createNewProject) {
                payload.new_ecotaxa_project = true;
            } else {
                const projectId = toNullableInt(values.ecoTaxa.project);
                if (projectId) payload.ecotaxa_project_id = projectId;
            }
            if (instanceId) payload.ecotaxa_instance_id = instanceId;
            if (accountId) payload.ecotaxa_account_id = accountId;

            const createdProject = await createProject(payload as PublicProjectRequestCreationModel);

            setIsRedirecting(true);
            showSnackbar("Project successfully created! Redirecting...", "success");

            redirectTimer.current = window.setTimeout(() => {
                navigate(`/projects/${createdProject.project_id}/import`);
            }, REDIRECT_DELAY_MS);
        } catch (error: unknown) {
            console.error("API Error during project creation:", error);

            const errorMessage = extractErrorMessage(error, "An unexpected error occurred while creating the project.");
            const mappedErrors = mapBackendErrorToFieldErrors(errorMessage);

            setErrors((prev) => ({
                ...prev,
                ...mappedErrors,
            }));

            showSnackbar(errorMessage, "error");
        } finally {
            setIsSubmitting(false);
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
        lockedTitlePrefix,
        checkingPeople,
        snackbar,
        closeSnackbar,
        isSubmitting,
        isRedirecting,
    };
};
