import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    Stack,
    FormControlLabel,
    Switch,
    MenuItem,
    Button,
    CircularProgress,
    FormHelperText,
} from "@mui/material";

import { useNavigate } from "react-router-dom";

import { NewProjectFormValues } from "../types/newProject.types";
import { getEcoTaxaAccounts, EcoTaxaAccountLink } from "@/features/userProfile/api/profile.api";
import { useAuthStore } from "@/features/auth/store/auth.store";

// NEW: Import the HTTP client to fetch instances directly from the backend
import { http } from "@/shared/api/http";

// NEW: Interface mirroring your SQLite table 'ecotaxa_instance'
interface EcoTaxaInstance {
    ecotaxa_instance_id: number;
    ecotaxa_instance_name: string;
    ecotaxa_instance_description: string;
    ecotaxa_instance_url: string;
}

interface EcoTaxaLinkSectionProps {
    values: NewProjectFormValues["ecoTaxa"];
    onChange: (data: Partial<NewProjectFormValues["ecoTaxa"]>) => void;
    projectTitle: string;
    errors?: {
        instance?: string;
        account?: string;
        project?: string;
    };
}

export const EcoTaxaLinkSection: React.FC<EcoTaxaLinkSectionProps> = ({
    values,
    onChange,
    projectTitle,
    errors,
}) => {
    const navigate = useNavigate();

    // --- 1. LOCAL STATES ---
    const { user } = useAuthStore();
    const [accounts, setAccounts] = useState<EcoTaxaAccountLink[]>([]);
    const [instances, setInstances] = useState<EcoTaxaInstance[]>([]); // Store the rich DB instances
    const [loadingData, setLoadingData] = useState(false);

    // Filter accounts to show only those matching the selected instance
    const availableAccounts = accounts.filter(
        (account) => values.instance === "" || account.ecotaxa_account_instance_id.toString() === values.instance
    );

    // --- 2. FETCH DATA (ACCOUNTS & INSTANCES) ---
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.user_id) return;

            setLoadingData(true);
            try {
                // 1. Fetch user's linked accounts
                const linkedAccounts = await getEcoTaxaAccounts(user.user_id);
                setAccounts(linkedAccounts);

                // 2. Fetch full instance details from DB to get descriptions and URLs
                try {
                    // Try to fetch from the real backend route (if the backend dev created it)
                    const dbInstances = await http<EcoTaxaInstance[]>("/ecotaxa_instances");
                    setInstances(dbInstances);
                } catch (apiError) {
                    // Use the apiError variable so ESLint doesn't complain
                    console.warn("Backend route for instances not found. Using fallback DB mock.", apiError);
                    
                    // FALLBACK: Perfectly matches your SQLite screenshot so the UI works today!
                    setInstances([
                        {
                            ecotaxa_instance_id: 1,
                            ecotaxa_instance_name: "FR",
                            ecotaxa_instance_description: "French instance of EcoTaxa, can be used world wilde.",
                            ecotaxa_instance_url: "https://ecotaxa.obs-vlfr.fr/"
                        }
                    ]);
                }

                // 3. Auto-select if none chosen
                if (linkedAccounts.length > 0 && !values.instance) {
                    onChange({
                        instance: linkedAccounts[0].ecotaxa_account_instance_id.toString(),
                        account: linkedAccounts[0].ecotaxa_account_id.toString(),
                    });
                }
            } catch (error) {
                console.error("Failed to load EcoTaxa data", error);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.user_id, values.instance]);

    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0 }}>
                <Typography variant="h6" gutterBottom>
                    Link to EcoTaxa
                </Typography>
                <Button variant="text" size="small" onClick={() => { navigate("/settings", { state: { activeTab: 1 } }); }}>
                    ADD AN ECOTAXA ACCOUNT →
                </Button>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
                <TextField
                    select
                    required
                    fullWidth
                    label="EcoTaxa instance"
                    value={values.instance}
                    onChange={(e) => {
                        onChange({
                            instance: e.target.value,
                            account: "",
                            project: "",
                        });
                    }}
                    size="medium" // Increased size to comfortably fit the multi-line text
                    error={Boolean(errors?.instance)}
                    helperText={errors?.instance}
                    // SelectProps configures how the *selected* value is rendered in the closed input
                    SelectProps={{
                        // Explicitly define 'selected' as unknown and cast to string to satisfy TypeScript ReactNode requirements
                        renderValue: (selected: unknown) => {
                            const selectedString = selected as string;
                            const instanceData = instances.find(inst => inst.ecotaxa_instance_id.toString() === selectedString);
                            
                            if (!instanceData) return selectedString; // Returns a string, which is a valid ReactNode
                            
                            return (
                                <Box sx={{ whiteSpace: "normal", lineHeight: 1.4 }}>
                                    <strong>{instanceData.ecotaxa_instance_name}</strong>, {instanceData.ecotaxa_instance_description} <br />
                                    ({instanceData.ecotaxa_instance_url})
                                </Box>
                            );
                        }
                    }}
                >
                    {/* Only show instances where the user has at least one account linked */}
                    {Array.from(new Set(accounts.map((account) => account.ecotaxa_account_instance_id))).map((instanceId) => {
                        // Find the rich data from the DB instances table
                        const instanceData = instances.find(inst => inst.ecotaxa_instance_id === instanceId);
                        const fallbackAccount = accounts.find((item) => item.ecotaxa_account_instance_id === instanceId);

                        return (
                            <MenuItem key={instanceId} value={instanceId.toString()} sx={{ py: 1.5 }}>
                                {instanceData ? (
                                    // FORMAT MATCHING THE MOCKUP
                                    <Box sx={{ whiteSpace: "normal", lineHeight: 1.4 }}>
                                        <strong>{instanceData.ecotaxa_instance_name}</strong>, {instanceData.ecotaxa_instance_description} <br />
                                        <Typography variant="body2" color="text.secondary">
                                            ({instanceData.ecotaxa_instance_url})
                                        </Typography>
                                    </Box>
                                ) : (
                                    // Fallback if DB instance data isn't loaded
                                    <Box><strong>{fallbackAccount?.ecotaxa_account_instance_name}</strong></Box>
                                )}
                            </MenuItem>
                        );
                    })}

                    {accounts.length === 0 && (
                        <MenuItem value="" disabled>
                            No accounts linked
                        </MenuItem>
                    )}
                </TextField>

                <TextField
                    select
                    fullWidth
                    required
                    label="Your EcoTaxa account"
                    value={values.account}
                    onChange={(e) => onChange({ account: e.target.value, project: "" })}
                    size="small"
                    disabled={!values.instance || loadingData}
                    error={Boolean(errors?.account)}
                    helperText={errors?.account}
                    InputProps={{
                        endAdornment: loadingData ? <CircularProgress size={20} /> : null,
                    }}
                >
                    {availableAccounts.map((account) => (
                        <MenuItem key={account.ecotaxa_account_id} value={account.ecotaxa_account_id.toString()}>
                            {account.ecotaxa_user_login || account.ecotaxa_user_name}
                        </MenuItem>
                    ))}
                </TextField>

                {values.createNewProject ? (
                    <TextField
                        fullWidth
                        required
                        label="EcoTaxa project"
                        value={`${projectTitle || "New project"} (new)`}
                        size="small"
                        disabled
                    />
                ) : (
                    <Box>
                        <TextField
                            select
                            fullWidth
                            label="EcoTaxa project"
                            value={values.project}
                            onChange={(e) => onChange({ project: e.target.value })}
                            size="small"
                            disabled={!values.account}
                            error={Boolean(errors?.project)}
                            helperText={errors?.project}
                        >
                            <MenuItem value="16187">existing_project_16187</MenuItem>
                            <MenuItem value="16188">existing_project_16188</MenuItem>
                        </TextField>
                    </Box>
                )}

                {values.createNewProject && (
                    <FormHelperText>
                        New project will be named: <strong>{projectTitle || "New project"}</strong>
                    </FormHelperText>
                )}

                <FormControlLabel
                    control={
                        <Switch
                            checked={values.createNewProject}
                            onChange={(e) => {
                                onChange({
                                    createNewProject: e.target.checked,
                                    project: "",
                                });
                            }}
                            color="primary"
                        />
                    }
                    label={
                        <Box>
                            <Typography variant="body1">Create a new EcoTaxa project</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Creates a new EcoTaxa project with same title as this EcoPart project.
                            </Typography>
                        </Box>
                    }
                    sx={{ alignItems: "flex-start" }}
                />
            </Stack>
        </Box>
    );
};