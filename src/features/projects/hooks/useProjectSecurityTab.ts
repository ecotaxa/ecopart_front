import { useState, useEffect, useCallback } from "react";
import type { AlertColor } from "@mui/material";

// Reuse the exact same types we use for creation to keep our Dumb Components happy
import { getProjectById, updateProject, type PublicProjectUpdateModel } from "../api/projects.api";
import { fetchActiveUsers, type UserSearchResponse } from "@/features/auth/api/users.api";
import { extractErrorMessage } from "@/shared/utils/errorMessage";
import {
    DEFAULT_PRIVACY,
    type ProjectFormErrors,
    type SecurityFormValues,
    buildPrivilegesPayload,
    mapProjectPrivacy,
    mapProjectPrivileges,
    validateProjectForm,
} from "../utils/projectForm";

export const useProjectSecurityTab = (projectId: number) => {
    // --------------------------------------------------
    // 1. STATE
    // --------------------------------------------------
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<ProjectFormErrors>({});
    const [availableUsers, setAvailableUsers] = useState<UserSearchResponse["users"]>([]);

    // We initialize only the parts of the form state relevant to the Security tab
    const [values, setValues] = useState<SecurityFormValues>({
        privileges: [],
        privacy: { ...DEFAULT_PRIVACY },
    });

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
        if (!projectId) return;
        // Ignore the response of a superseded load (project id changed / unmount).
        let cancelled = false;

        const loadData = async () => {
            setLoading(true);

            try {
                // The users list (privileges dropdown) and the project are independent.
                const [usersResponse, projectData] = await Promise.all([
                    fetchActiveUsers(),
                    getProjectById(projectId),
                ]);
                if (cancelled) return;

                if (usersResponse?.users) {
                    setAvailableUsers(usersResponse.users);
                }

                setValues({
                    privacy: mapProjectPrivacy(projectData),
                    privileges: mapProjectPrivileges(projectData),
                });
                setErrors({});
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to load project security details", error);
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
    const updateField = useCallback(<T extends keyof SecurityFormValues>(
        section: T,
        data: Partial<SecurityFormValues[T]> | SecurityFormValues[T]
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
        // Editing a section clears its inline errors.
        setErrors((prev) => {
            const next = { ...prev };
            if (section === "privileges") {
                delete next.privilegesManager;
                delete next.privilegesContact;
            } else {
                delete next.privateMonths;
                delete next.visibleMonths;
                delete next.publicMonths;
            }
            return next;
        });
    }, []);

    // --------------------------------------------------
    // 4. SAVE HANDLER (PATCH REQUEST)
    // --------------------------------------------------
    const handleSave = async () => {
        if (saving) return;

        // Same rules as project creation, restricted to what this tab edits.
        const nextErrors = validateProjectForm(values, { privileges: true, privacy: true });
        setErrors(nextErrors);
        const firstError = Object.values(nextErrors)[0];
        if (firstError) {
            showSnackbar(firstError, "warning");
            return;
        }

        setSaving(true);

        try {
            const { contact, managers, members } = buildPrivilegesPayload(values.privileges);

            // Map UI State back to Backend PATCH Model.
            // Only the security fields are sent: the backend PATCH route accepts
            // partial updates.
            const payload: PublicProjectUpdateModel = {
                privacy_duration: values.privacy.privateMonths,
                visible_duration: values.privacy.visibleMonths,
                public_duration: values.privacy.publicMonths,
                contact,
                managers,
                members,
            };

            await updateProject(projectId, payload);

            showSnackbar("Security settings updated successfully!", "success");
        } catch (error: unknown) {
            console.error("Failed to update project security", error);
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
        availableUsers,
        updateField,
        handleSave,
        handleCancel,
        snackbar,
        closeSnackbar,
    };
};
