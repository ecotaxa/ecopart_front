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

    // --- 1. LOCAL STATE FOR EXTERNAL DATA ---
    const { user } = useAuthStore();
    const [accounts, setAccounts] = useState<EcoTaxaAccountLink[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const availableAccounts = accounts.filter(
        (account) => values.instance === "" || account.ecotaxa_account_instance_id.toString() === values.instance
    );

    // --- 2. FETCH LINKED ACCOUNTS ---
    useEffect(() => {
        const fetchAccounts = async () => {
            if (!user?.user_id) return;

            setLoadingAccounts(true);
            try {
                const linkedAccounts = await getEcoTaxaAccounts(user.user_id);
                setAccounts(linkedAccounts);

                if (linkedAccounts.length > 0 && !values.instance) {
                    onChange({
                        instance: linkedAccounts[0].ecotaxa_account_instance_id.toString(),
                        account: linkedAccounts[0].ecotaxa_account_id.toString(),
                    });
                }
            } catch (error) {
                console.error("Failed to load EcoTaxa accounts", error);
            } finally {
                setLoadingAccounts(false);
            }
        };

        fetchAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.user_id, values.instance]);

    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0 }}>
                <Typography variant="h6" gutterBottom>
                    Link to EcoTaxa
                </Typography>
                <Button variant="text" size="small" onClick={() => { navigate("/settings", { state: { activeTab: 1 } });}}>
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
                    size="small"
                    error={Boolean(errors?.instance)}
                    helperText={errors?.instance}
                >
                    {Array.from(new Set(accounts.map((account) => account.ecotaxa_account_instance_id))).map((instanceId) => {
                        const account = accounts.find((item) => item.ecotaxa_account_instance_id === instanceId);
                        return (
                            <MenuItem key={instanceId} value={instanceId.toString()}>
                                {account?.ecotaxa_account_instance_name}
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
                    disabled={!values.instance || loadingAccounts}
                    error={Boolean(errors?.account)}
                    helperText={errors?.account}
                    InputProps={{
                        endAdornment: loadingAccounts ? <CircularProgress size={20} /> : null,
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
                            //required
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