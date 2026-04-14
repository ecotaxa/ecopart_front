import { useEffect, useState } from "react";
import { NewProjectFormValues } from "../types/newProject.types";
import { PublicProjectRequestCreationModel } from "../api/projects.api";
import { fetchActiveUsers, UserSearchResponse } from "@/features/auth/api/users.api"; // Adjust path as needed

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
            timeDurationCheck: false,
        },
        people: {
            dataOwnerName: "",
            dataOwnerEmail: "",
            chiefScientistName: "",
            chiefScientistEmail: "",
            operatorName: "",
            operatorEmail: "",
        },
        importSettings: {
            overrideDepthOffset: 0,
            enableDescentFilter: false,
        },
        ecoTaxa: {
            instance: "",
            account: "",
            project: "",
            createNewProject: false,
        },
        privileges: [],
        privacy: {
            privateMonths: 0,
            visibleMonths: 0,
            publicMonths: 0,
        },
        dataServer: {
            host: "",
            username: "",
            password: "",
            directory: "",
            vectorReference: "",
        },
    });

    // State to store real users fetched from DB
    const [availableUsers, setAvailableUsers] = useState<UserSearchResponse['users']>([]);

    // Computed property to check if the instrument is "remote"
    // We check if the selected string contains the word "remote" (case insensitive)
    const isRemoteProject = values.instrument.model.toLowerCase().includes("remote");

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
            }
        };
        loadUsers();
    }, []);

    // --------------------------------------------------
    // 2. DYNAMIC FIELD UPDATER
    // --------------------------------------------------
    // T extends keyof NewProjectFormValues limits T to valid sections (e.g. 'metadata', 'rootFolderPath')
    // The data parameter can be a Partial object (for merging) OR the exact type (for replacing primitives)
    const updateField = <T extends keyof NewProjectFormValues>(
        section: T,
        data: Partial<NewProjectFormValues[T]> | NewProjectFormValues[T]
    ) => {
        setValues((prev) => {
            // Get the current value of the targeted section
            const currentValue = prev[section];

            // SCENARIO A: It's a nested object (like metadata or people)
            // We ensure it's an object, not an array, and not null.
            if (typeof currentValue === "object" && !Array.isArray(currentValue) && currentValue !== null) {
                return {
                    ...prev, // Keep all other sections intact
                    [section]: {
                        ...(currentValue as object), // Keep existing fields inside this section
                        ...(data as object),         // Overwrite with the newly changed fields
                    },
                };
            }

            // SCENARIO B: It's a primitive (like rootFolderPath string) or an array (privileges)
            // We just replace the entire value instead of trying to merge it
            return {
                ...prev,
                [section]: data as NewProjectFormValues[T],
            };
        });
    };

    // --------------------------------------------------
    // 4. METADATA PARSER (Auto-fill logic)
    // --------------------------------------------------
    const handleLoadMetadata = async () => {
        if (!values.rootFolderPath) {
            alert("Please enter a root folder path first.");
            return;
        }

        console.log(`[MOCK PARSER] Extracting metadata from: ${values.rootFolderPath}`);

        // 1. Extract the folder name from the path (e.g., "plankton/uvp5/uvp5_sn000_tara2011" -> "uvp5_sn000_tara2011")
        const pathParts = values.rootFolderPath.split('/');
        const folderName = pathParts[pathParts.length - 1];

        // 2. Split the folder name by underscores (e.g., ["uvp5", "sn000", "tara2011"])
        const nameParts = folderName.split('_');

        // 3. Map the extracted parts to the form fields
        if (nameParts.length >= 3) {
            // Backend requires specific instrument names (e.g., "UVP5HD" instead of just "uvp5")
            // We do a simple fallback formatting here.
            const parsedInstrumentRaw = nameParts[0].toUpperCase();
            // In a real app, you might map "UVP5" to "UVP5HD" by default if needed by the backend
            const parsedInstrument = parsedInstrumentRaw.includes("UVP5") ? "UVP5HD" : parsedInstrumentRaw;

            const parsedSerial = nameParts[1]; // "sn000"
            const parsedCruise = nameParts.slice(2).join('_'); // "tara2011" (handles cases where cruise has underscores)

            // Update Instrument fields
            updateField('instrument', {
                model: parsedInstrument,
                serialNumber: parsedSerial
            });

            // Update Metadata fields
            updateField('metadata', {
                title: folderName, // e.g., "uvp5_sn000_tara2011"
                acronym: parsedCruise, // e.g., "tara2011"
                cruise: parsedCruise
            });

            // Note: We don't touch 'ship', user will enter it manually or we fetch it later
        } else {
            alert("The folder name format does not match the expected {instrument}_{serial}_{cruise} format.");
        }
    };

    // --------------------------------------------------
    // 3. SUBMIT HANDLER
    // --------------------------------------------------
    const handleSubmit = async () => {
        try {
            // 1. DATA MAPPING (Transformation Front -> Back)
            // On convertit notre objet 'values' en ce que l'API attend exactement
            const payload: PublicProjectRequestCreationModel = {
                root_folder_path: values.rootFolderPath,

                // Metadata
                project_title: values.metadata.title,
                project_acronym: values.metadata.acronym,
                // Le backend veut une string. On transforme notre tableau ["tara", "purquoi_pas"] en "tara, pourquoi_pas"
                ship: values.metadata.ship.join(", "),
                cruise: values.metadata.cruise,
                project_description: values.metadata.description,
                project_information: "", // Si tu as un champ pour ça plus tard

                // Peoples
                data_owner_name: values.people.dataOwnerName,
                data_owner_email: values.people.dataOwnerEmail,
                operator_name: values.people.operatorName,
                operator_email: values.people.operatorEmail,
                chief_scientist_name: values.people.chiefScientistName,
                chief_scientist_email: values.people.chiefScientistEmail,

                // Instrument & Settings
                instrument_model: values.instrument.model,
                serial_number: values.instrument.serialNumber,
                override_depth_offset: values.importSettings.overrideDepthOffset,
                enable_descent_filter: values.importSettings.enableDescentFilter,

                // Privacy (Backend sets defaults 2, 24, 36 if not provided)
                privacy_duration: values.privacy.privateMonths,
                visible_duration: values.privacy.visibleMonths,
                public_duration: values.privacy.publicMonths,

                // Ecotaxa
                new_ecotaxa_project: values.ecoTaxa.createNewProject,
                ecotaxa_account_id: values.ecoTaxa.account ? parseInt(values.ecoTaxa.account) : null,
                ecotaxa_instance_id: values.ecoTaxa.instance ? parseInt(values.ecoTaxa.instance) : null,
                ecotaxa_project_id: values.ecoTaxa.project ? parseInt(values.ecoTaxa.project) : null,
                ecotaxa_project_name: null, // Ou la valeur correspondante

                // Privileges (Transforming our simple array into the array of objects the backend needs)
                // Ex: [{ user_id: 1 }]
                contact: { user_id: 1 }, // TODO: Remplacer par le vrai user_id sélectionné dans l'UI
                members: values.privileges.filter(p => p.role === 'Member').map(p => ({ user_id: parseInt(p.userId) })),
                managers: values.privileges.filter(p => p.role === 'Manager').map(p => ({ user_id: parseInt(p.userId) })),
            };

            console.log("Mapped Payload ready for API:", payload);

            // 2. APPEL API
            // const response = await createProject(payload);
            // alert("Projet créé avec succès !");

        } catch (error) {
            console.error("Validation or API Error:", error);
        }
    };

    return {
        values,
        updateField,
        handleSubmit,
        handleLoadMetadata,
        availableUsers, // EXPORT the users to the UI
        isRemoteProject // EXPORT the remote condition
    };
};