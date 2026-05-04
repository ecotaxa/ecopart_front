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
import {
    getEcoTaxaAccounts,
    getEcoTaxaInstances,
    EcoTaxaAccountLink,
    EcoTaxaInstance
} from "@/features/userProfile/api/profile.api";
import { useAuthStore } from "@/features/auth/store/auth.store";

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
    const [instances, setInstances] = useState<EcoTaxaInstance[]>([]); 
    const [loadingData, setLoadingData] = useState(false);

    const availableInstanceIds = new Set(
        accounts.map((account) => account.ecotaxa_account_instance_id.toString())
    );
    const safeInstanceValue = values.instance && availableInstanceIds.has(values.instance)
        ? values.instance
        : "";

    const availableAccounts = accounts.filter(
        (account) => safeInstanceValue === "" || account.ecotaxa_account_instance_id.toString() === safeInstanceValue
    );

    const safeAccountValue = values.account && availableAccounts.some(
        (account) => account.ecotaxa_account_id.toString() === values.account
    )
        ? values.account
        : "";

    // --- 2. FETCH DATA (ACCOUNTS & INSTANCES) ---
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.user_id) return;

            setLoadingData(true);
            try {
                const linkedAccounts = await getEcoTaxaAccounts(user.user_id);
                setAccounts(linkedAccounts);

                try {
                    const dbInstances = await getEcoTaxaInstances();
                    setInstances(dbInstances);
                } catch (apiError) {
                    console.warn("Failed to fetch EcoTaxa instances from API.", apiError);
                    setInstances([]);
                }

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
                    value={safeInstanceValue}
                    onChange={(e) => {
                        onChange({
                            instance: e.target.value,
                            account: "",
                            project: "",
                        });
                    }}
                    size="medium"
                    error={Boolean(errors?.instance)}
                    helperText={errors?.instance}
                    SelectProps={{
                        renderValue: (selected: unknown) => {
                            const selectedString = selected as string;
                            if (!selectedString) return "";
                            const instanceData = instances.find(inst => inst.ecotaxa_instance_id.toString() === selectedString);

                            if (!instanceData) return selectedString;

                            return (
                                <Box sx={{ whiteSpace: "normal", lineHeight: 1.4 }}>
                                    <strong>{instanceData.ecotaxa_instance_name}</strong>, {instanceData.ecotaxa_instance_description} <br />
                                    ({instanceData.ecotaxa_instance_url})
                                </Box>
                            );
                        }
                    }}
                >
                    {Array.from(new Set(accounts.map((account) => account.ecotaxa_account_instance_id))).map((instanceId) => {
                        const instanceData = instances.find(inst => inst.ecotaxa_instance_id === instanceId);
                        const fallbackAccount = accounts.find((item) => item.ecotaxa_account_instance_id === instanceId);

                        return (
                            <MenuItem key={instanceId} value={instanceId.toString()} sx={{ py: 1.5 }}>
                                {instanceData ? (
                                    <Box sx={{ whiteSpace: "normal", lineHeight: 1.4 }}>
                                        <strong>{instanceData.ecotaxa_instance_name}</strong>, {instanceData.ecotaxa_instance_description} <br />
                                        <Typography variant="body2" color="text.secondary">
                                            ({instanceData.ecotaxa_instance_url})
                                        </Typography>
                                    </Box>
                                ) : (
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
                    value={safeAccountValue}
                    onChange={(e) => onChange({ account: e.target.value, project: "" })}
                    size="small"
                    disabled={!safeInstanceValue || loadingData}
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

                {/* MENTOR FIX: Replaced the hardcoded 'select' dropdown with a free-text input 
                    when not creating a new project. This allows the user to type any existing project ID. */}
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
                            fullWidth
                            label="EcoTaxa project ID"
                            placeholder="Enter existing EcoTaxa project ID (e.g. 16188)"
                            value={values.project}
                            onChange={(e) => onChange({ project: e.target.value })}
                            size="small"
                            disabled={!values.account}
                            error={Boolean(errors?.project)}
                            helperText={errors?.project}
                        />
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