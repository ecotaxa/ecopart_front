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
    CircularProgress
} from "@mui/material";
import Grid from "@mui/material/Grid"; // Material UI v6 Grid

// Import form types
import { NewProjectFormValues } from "../types/newProject.types";

// Import API and types from your profile feature (Code reusability!)
import { getEcoTaxaAccounts, EcoTaxaAccountLink } from "@/features/userProfile/api/profile.api";
import { useAuthStore } from "@/features/auth/store/auth.store";

interface EcoTaxaLinkSectionProps {
    values: NewProjectFormValues['ecoTaxa'];
    onChange: (data: Partial<NewProjectFormValues['ecoTaxa']>) => void;
    // Note: We might need project title/acronym to display the "new project name" 
    // as shown in the mockup: "uvp5_sn000_tara2011 (new)"
    projectTitle: string;
}

export const EcoTaxaLinkSection: React.FC<EcoTaxaLinkSectionProps> = ({
    values,
    onChange,
    projectTitle
}) => {
    // --- 1. LOCAL STATE FOR EXTERNAL DATA ---
    const { user } = useAuthStore();
    const [accounts, setAccounts] = useState<EcoTaxaAccountLink[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    // Filter accounts based on selected instance
    const availableAccounts = accounts.filter(acc =>
        values.instance === "" || acc.ecotaxa_account_instance_id.toString() === values.instance
    );

    // --- 2. FETCH LINKED ACCOUNTS ---
    useEffect(() => {
        const fetchAccounts = async () => {
            if (!user) return;
            setLoadingAccounts(true);
            try {
                const linkedAccounts = await getEcoTaxaAccounts(user.user_id);
                setAccounts(linkedAccounts);

                // If accounts exist and no instance is selected, auto-select the first one's instance
                if (linkedAccounts.length > 0 && !values.instance) {
                    onChange({
                        instance: linkedAccounts[0].ecotaxa_account_instance_id.toString(),
                        account: linkedAccounts[0].ecotaxa_account_id.toString()
                    });
                }
            } catch (error) {
                console.error("Failed to load EcoTaxa accounts", error);
            } finally {
                setLoadingAccounts(false);
            }
        };
        fetchAccounts();
    }, [user, onChange, values.instance]);

    // --- 3. RENDER ---
    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
                <Typography variant="h6" gutterBottom>
                    Link to EcoTaxa
                </Typography>
                <Button variant="text" size="small" href="https://ecotaxa.obs-vlfr.fr/register" target="_blank">
                    ADD AN ECOTAXA ACCOUNT →
                </Button>
            </Box>
            <Divider sx={{ mb: 3 }} />
                {/* LEFT COLUMN: EcoTaxa Link settings */}
                    <Stack spacing={3}>

                        {/* 1. INSTANCE SELECTION */}
                        <TextField
                            select
                            fullWidth
                            label="EcoTaxa instance*"
                            value={values.instance}
                            onChange={(e) => {
                                // If instance changes, clear the account and project selection
                                onChange({
                                    instance: e.target.value,
                                    account: "",
                                    project: ""
                                });
                            }}
                            size="small"
                        >
                            {/* Derive unique instances from the linked accounts */}
                            {Array.from(new Set(accounts.map(a => a.ecotaxa_account_instance_id))).map(instanceId => {
                                const acc = accounts.find(a => a.ecotaxa_account_instance_id === instanceId);
                                return (
                                    <MenuItem key={instanceId} value={instanceId.toString()}>
                                        {acc?.ecotaxa_account_instance_name}
                                    </MenuItem>
                                );
                            })}
                            {accounts.length === 0 && (
                                <MenuItem value="" disabled>No accounts linked</MenuItem>
                            )}
                        </TextField>

                        {/* 2. ACCOUNT SELECTION */}
                        <TextField
                            select
                            fullWidth
                            label="Your EcoTaxa account*"
                            value={values.account}
                            onChange={(e) => onChange({ account: e.target.value, project: "" })}
                            size="small"
                            disabled={!values.instance || loadingAccounts}
                            InputProps={{
                                endAdornment: loadingAccounts ? <CircularProgress size={20} /> : null
                            }}
                        >
                            {availableAccounts.map(acc => (
                                <MenuItem key={acc.ecotaxa_account_id} value={acc.ecotaxa_account_id.toString()}>
                                    {acc.ecotaxa_user_login || acc.ecotaxa_user_name}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* 3. PROJECT SELECTION / CREATION */}
                        <TextField
                            select={!values.createNewProject} // If new project, it becomes a disabled text field showing the new name
                            fullWidth
                            label="EcoTaxa project*"
                            value={values.createNewProject ? "new" : values.project}
                            onChange={(e) => onChange({ project: e.target.value })}
                            size="small"
                            disabled={values.createNewProject || !values.account}
                        >
                            {values.createNewProject ? (
                                // Show a fake disabled option to mimic the mockup "uvp5_sn000_tara (new)"
                                <MenuItem value="new">{projectTitle || "New project"} (new)</MenuItem>
                            ) : (
                                // TODO: This should be populated by an API call fetching projects for the selected account
                                // For now, we mock an existing project for visual completeness
                                [
                                    <MenuItem key="1" value="existing_1">existing_project_1</MenuItem>,
                                    <MenuItem key="2" value="existing_2">existing_project_2</MenuItem>
                                ]
                            )}
                        </TextField>

                        {/* 4. SWITCH: CREATE NEW PROJECT */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={values.createNewProject}
                                    onChange={(e) => {
                                        // Toggle state and clear existing project selection if switching to new
                                        onChange({
                                            createNewProject: e.target.checked,
                                            project: e.target.checked ? "" : values.project
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
                            sx={{ alignItems: 'flex-start' }}
                        />

                    </Stack>
                {/* RIGHT COLUMN: Empty */}
                <Grid size={{ xs: 12, md: 6 }}>
                    {/* Intentionally left blank as per mockup design */}
                </Grid>
        </Box>
    );
};