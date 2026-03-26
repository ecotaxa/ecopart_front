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

export const useProjectSecurityTab = (projectId: number) => {
    // --------------------------------------------------
    // 1. STATE
    // --------------------------------------------------
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<UserSearchResponse["users"]>([]);

    // We initialize only the parts of the form state relevant to the Security tab
    const [values, setValues] = useState<{
        privileges: NewProjectFormValues["privileges"];
        privacy: NewProjectFormValues["privacy"];
    }>({
        privileges: [],
        privacy: { privateMonths: 2, visibleMonths: 24, publicMonths: 36 },
    });

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

                // --- MAP BACKEND DATA TO FRONTEND UI STATE ---
                setValues({
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
                });
            } catch (error) {
                console.error("Failed to load project security details", error);
                showSnackbar("Failed to load project details.", "error");
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            loadData();
        }
    }, [projectId]);

    // --------------------------------------------------
    // 3. FIELD UPDATER
    // --------------------------------------------------
    const updateField = <T extends keyof typeof values>(
        section: T,
        data: Partial<typeof values[T]> | typeof values[T]
    ) => {
        setValues((prev) => {
            const currentValue = prev[section];

            // Handle object updates (like privacy)
            if (typeof currentValue === "object" && !Array.isArray(currentValue) && currentValue !== null) {
                return {
                    ...prev,
                    [section]: { ...(currentValue as object), ...(data as object) },
                };
            }

            // Handle array updates (like privileges)
            return {
                ...prev,
                [section]: data,
            };
        });
    };

    // --------------------------------------------------
    // 4. HELPERS
    // --------------------------------------------------
    const safeParseInt = (value: string, fallback: number = 1): number => {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? fallback : parsed;
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

            if (!selectedContact) {
                showSnackbar("A contact is required before saving.", "warning");
                setSaving(false);
                return;
            }

            // Map UI State back to Backend PATCH Model.
            // Note: We use Partial<PublicProjectUpdateModel> because we are ONLY updating security fields.
            // The backend PATCH route must be capable of receiving partial updates without complaining about missing required fields.
            const payload: Partial<PublicProjectUpdateModel> = {
                privacy_duration: values.privacy.privateMonths,
                visible_duration: values.privacy.visibleMonths,
                public_duration: values.privacy.publicMonths,
                
                contact: { user_id: safeParseInt(selectedContact.userId) },
                
                managers: values.privileges
                    .filter((row) => row.role === "Manager" && row.userId.trim() !== "")
                    .map((row) => ({ user_id: safeParseInt(row.userId) })),
                    
                members: values.privileges
                    .filter((row) => row.role === "Member" && row.userId.trim() !== "")
                    .map((row) => ({ user_id: safeParseInt(row.userId) })),
            };

            console.log("[ProjectSecurity] PATCH Payload:", payload);

            await updateProject(projectId, payload as PublicProjectUpdateModel);

            showSnackbar("Security settings updated successfully!", "success");
        } catch (error: unknown) {
            console.error("Failed to update project security", error);
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
        updateField,
        handleSave,
        handleCancel,
        snackbar,
        closeSnackbar,
    };
};