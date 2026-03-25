import { useState, useEffect, useCallback } from "react";
import { AlertColor } from "@mui/material";
import { NewProjectFormValues } from "../types/newProject.types";
import { fetchActiveUsers, UserSearchResponse } from "@/features/auth/api/users.api";
// NEW: Import the real API functions
import { getProjectById, updateProject, PublicProjectUpdateModel } from "../api/projects.api";

export const useProjectMetadataTab = (projectId: number) => {
    // --- 1. STATE INITIALIZATION ---
    // Start with empty/default values
    const [values, setValues] = useState<NewProjectFormValues>({
        rootFolderPath: "",
        instrument: { model: "", serialNumber: "" },
        metadata: { title: "", acronym: "", ship: [], cruise: "", description: "", filteredBeforeImport: false, timeDurationCheck: false },
        people: { dataOwnerName: "", dataOwnerEmail: "", chiefScientistName: "", chiefScientistEmail: "", operatorName: "", operatorEmail: "" },
        importSettings: { overrideDepthOffset: 0, enableDescentFilter: false },
        ecoTaxa: { instance: "", account: "", project: "", createNewProject: false },
        privileges: [],
        privacy: { privateMonths: 0, visibleMonths: 0, publicMonths: 0 },
        dataServer: { host: "", username: "", password: "", directory: "", vectorReference: "" },
    });

    const [loading, setLoading] = useState(true);
    const [availableUsers, setAvailableUsers] = useState<UserSearchResponse['users']>([]);
    
    // Snackbar State
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false, message: "", severity: "info",
    });

    const isRemoteProject = values.instrument.model.toLowerCase().includes("remote");

    const showSnackbar = (message: string, severity: AlertColor = "info") => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

    // --- 2. DATA FETCHING AND MAPPING ---
    const fetchProjectData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch users for the privileges dropdown
            const usersResponse = await fetchActiveUsers();
            if (usersResponse && usersResponse.users) {
                setAvailableUsers(usersResponse.users);
            }

            // ---------------------------------------------------------
            // REAL API CALL
            // ---------------------------------------------------------
            const projectData = await getProjectById(projectId);
            
            // MAPPER: Backend (Snake Case) -> Frontend (Nested Camel Case)
            // We use '|| ""' to safely handle null values from the DB and avoid React uncontrolled input errors
            setValues({
                rootFolderPath: projectData.root_folder_path || "",
                instrument: {
                    model: projectData.instrument_model || "",
                    serialNumber: projectData.serial_number || "",
                },
                metadata: {
                    title: projectData.project_title || "",
                    acronym: projectData.project_acronym || "",
                    // The backend sends a string "tara, pourquoi_pas", we split it into an array for the Autocomplete
                    ship: projectData.ship ? projectData.ship.split(',').map((s: string) => s.trim()) : [],
                    cruise: projectData.cruise || "",
                    description: projectData.project_description || "",
                    filteredBeforeImport: false, // Placeholder as it might not be in DB yet
                    timeDurationCheck: false,    // Placeholder
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
                    overrideDepthOffset: projectData.override_depth_offset || 0,
                    enableDescentFilter: projectData.enable_descent_filter || false,
                },
                ecoTaxa: {
                    instance: projectData.ecotaxa_instance_id?.toString() || "",
                    account: "", // Requires separate fetch if needed, or left empty initially
                    project: projectData.ecotaxa_project_id?.toString() || "",
                    createNewProject: false,
                },
                // Note: Privileges usually require a separate fetch from the PrivilegeRepository
                // For now we leave it empty to match the UI mockup
                privileges: [], 
                privacy: {
                    privateMonths: projectData.privacy_duration || 0,
                    visibleMonths: projectData.visible_duration || 0,
                    publicMonths: projectData.public_duration || 0,
                },
                // DataServer is not fully defined in backend yet
                dataServer: { host: "", username: "", password: "", directory: "", vectorReference: "" },
            });

        } catch (error) {
            console.error("Error fetching project data", error);
            showSnackbar("Failed to load project metadata.", "error");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);

    // --- 3. UPDATERS ---
    const updateField = <T extends keyof NewProjectFormValues>(
        section: T,
        data: Partial<NewProjectFormValues[T]> | NewProjectFormValues[T]
    ) => {
        setValues((prev) => {
            const currentValue = prev[section];
            if (typeof currentValue === "object" && !Array.isArray(currentValue) && currentValue !== null) {
                return { ...prev, [section]: { ...(currentValue as object), ...(data as object) } };
            }
            return { ...prev, [section]: data as NewProjectFormValues[T] };
        });
    };

    // --- 4. ACTION HANDLERS ---
    const handleSave = async () => {
        try {
            showSnackbar("Saving changes...", "info");
            
            // 1. REVERSE MAPPING: Frontend -> Backend Format
            // Prepare the payload for the PATCH request
            const payload: PublicProjectUpdateModel = {
                project_title: values.metadata.title,
                project_acronym: values.metadata.acronym,
                ship: values.metadata.ship.join(", "),
                cruise: values.metadata.cruise,
                project_description: values.metadata.description,
                
                data_owner_name: values.people.dataOwnerName,
                data_owner_email: values.people.dataOwnerEmail,
                operator_name: values.people.operatorName,
                operator_email: values.people.operatorEmail,
                chief_scientist_name: values.people.chiefScientistName,
                chief_scientist_email: values.people.chiefScientistEmail,
                
                override_depth_offset: values.importSettings.overrideDepthOffset,
                enable_descent_filter: values.importSettings.enableDescentFilter,
                
                privacy_duration: values.privacy.privateMonths,
                visible_duration: values.privacy.visibleMonths,
                public_duration: values.privacy.publicMonths,
            };

            console.log("Payload to patch:", payload);
            
            // REAL API CALL
            await updateProject(projectId, payload);
            
            showSnackbar("Project metadata updated successfully!", "success");
        } catch (error) {
            console.error("Error saving project", error);
            showSnackbar("Failed to save changes. Please try again.", "error");
        }
    };

    const handleCancel = () => {
        // Re-fetch original data to discard unsaved changes
        fetchProjectData();
        showSnackbar("Changes discarded.", "info");
    };

    return {
        values,
        loading,
        updateField,
        handleSave,
        handleCancel,
        availableUsers,
        isRemoteProject,
        snackbar,
        closeSnackbar
    };
};