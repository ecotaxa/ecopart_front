import React, { useEffect, useState } from "react";
import {
    Box,
    Alert,
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
    IconButton,
    Tooltip,
} from "@mui/material";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
    linkedProject?: {
        projectId: number;
        projectName: string;
        instanceId: number | null;
    } | null;
    unlinkWarning?: string | null;
    onUnlink?: () => void;
    showCreateNewProjectToggle?: boolean;
    autoSelectLinkedAccount?: boolean;
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
    linkedProject = null,
    unlinkWarning = null,
    onUnlink,
    showCreateNewProjectToggle = true,
    autoSelectLinkedAccount = true,
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

                if (autoSelectLinkedAccount && linkedAccounts.length > 0 && !values.instance) {
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
    }, [user?.user_id, values.instance, onChange, autoSelectLinkedAccount]);

    const linkedInstanceData = linkedProject?.instanceId
        ? instances.find((instance) => instance.ecotaxa_instance_id === linkedProject.instanceId)
        : undefined;

    const linkedProjectLabel = linkedProject
        ? `${linkedProject.projectName || `EcoTaxa project ${linkedProject.projectId}`} - ${linkedProject.projectId}${linkedInstanceData ? ` - ${linkedInstanceData.ecotaxa_instance_name}` : ""}`
        : "";

    const linkedProjectUrl = linkedProject?.instanceId
        ? `${linkedInstanceData?.ecotaxa_instance_url || "https://ecotaxa.obs-vlfr.fr"}/prj/${linkedProject.projectId}`
        : `https://ecotaxa.obs-vlfr.fr/prj/${linkedProject?.projectId ?? ""}`;

    const renderEditFields = () => (
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

            {showCreateNewProjectToggle && (
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
            )}

            {showCreateNewProjectToggle && values.createNewProject && (
                <FormHelperText>
                    New project will be named: <strong>{projectTitle || "New project"}</strong>
                </FormHelperText>
            )}
        </Stack>
    );

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
                {linkedProject ? (
                    <>
                        <TextField
                            fullWidth
                            label="EcoTaxa project"
                            value={linkedProjectLabel}
                            size="small"
                            disabled
                            InputProps={{
                                endAdornment: (
                                    <Tooltip title="Open EcoTaxa project">
                                        <IconButton
                                            aria-label="Open EcoTaxa project"
                                            size="small"
                                            onClick={() => window.open(linkedProjectUrl, "_blank", "noopener,noreferrer")}
                                            sx={{ color: "primary.main" }}
                                        >
                                            <OpenInNewIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                ),
                            }}
                        />

                        <Button
                            variant="outlined"
                            color="error"
                            onClick={onUnlink}
                            sx={{ alignSelf: "stretch" }}
                        >
                            UNLINK ECOTAXA PROJECT
                        </Button>
                    </>
                ) : (
                    renderEditFields()
                )}

                {unlinkWarning && (
                    <Alert severity="warning">
                        You will still need to click on the save button to validates the changes. All samples in this project will be marked as "not imported" in EcoTaxa. Their EcoTaxa import history (status, date, sample ID) will be cleared. You will need to re-import them if you link a new EcoTaxa project.
                    </Alert>
                )}
            </Stack>
        </Box>
    );
};