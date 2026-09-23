import React from "react";
import { Box, Divider, TextField, Typography, InputAdornment, Tooltip, CircularProgress } from "@mui/material";
import Grid from "@mui/material/Grid";
// Imported icons matching your request (Verified Shield vs Unverified Person)
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PersonOffIcon from '@mui/icons-material/PersonOff';

import type { NewProjectFormValues } from "../types/newProject.types";

interface ProjectPeopleSectionProps {
    values: NewProjectFormValues["people"];
    onChange: (data: Partial<NewProjectFormValues["people"]>) => void;
    errors?: {
        dataOwnerName?: string;
        dataOwnerEmail?: string;
        chiefScientistName?: string;
        chiefScientistEmail?: string;
        operatorName?: string;
        operatorEmail?: string;
    };
    /** True while the emails are being looked up in the EcoPart accounts (usePeopleEmailCheck). */
    checking?: boolean;
}

interface VerificationIconProps {
    // undefined = not resolved yet, null = no account, number = confirmed account.
    userId?: number | null;
    emailValue: string;
    checking: boolean;
}

const VerificationIcon: React.FC<VerificationIconProps> = ({ userId, emailValue, checking }) => {
    // If the email field is empty, don't show any icon
    if (!emailValue.trim()) return null;

    if (userId === undefined) {
        // Unresolved: a spinner while the lookup runs, nothing otherwise
        // (malformed email, or the lookup failed).
        return checking ? (
            <Tooltip title="Checking the Ecopart accounts…">
                <CircularProgress size={18} />
            </Tooltip>
        ) : null;
    }

    if (userId) {
        return (
            <Tooltip title={`Ecopart User Confirmed (ID: ${userId})`}>
                <VerifiedUserIcon sx={{ color: "action.active" }} />
            </Tooltip>
        );
    }

    return (
        <Tooltip title="User email not found in Ecopart database. They will need to register.">
            <PersonOffIcon sx={{ color: "action.disabled" }} />
        </Tooltip>
    );
};

const ProjectPeopleSectionImpl: React.FC<ProjectPeopleSectionProps> = ({
    values,
    onChange,
    errors,
    checking = false,
}) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
                Project people
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={4}>
                {/* --- DATA OWNER --- */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Data owner name"
                        value={values.dataOwnerName}
                        onChange={(e) => onChange({ dataOwnerName: e.target.value })}
                        size="small"
                        error={Boolean(errors?.dataOwnerName)}
                        helperText={errors?.dataOwnerName}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Data owner email"
                        value={values.dataOwnerEmail}
                        // A different email is no longer the verified EcoPart account: back to "unresolved" so it gets looked up again.
                        onChange={(e) => onChange({ dataOwnerEmail: e.target.value, dataOwnerId: undefined })}
                        size="small"
                        error={Boolean(errors?.dataOwnerEmail)}
                        helperText={errors?.dataOwnerEmail}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <VerificationIcon userId={values.dataOwnerId} emailValue={values.dataOwnerEmail} checking={checking} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </Grid>

                {/* --- CHIEF SCIENTIST --- */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Chief scientist name"
                        value={values.chiefScientistName}
                        onChange={(e) => onChange({ chiefScientistName: e.target.value })}
                        size="small"
                        error={Boolean(errors?.chiefScientistName)}
                        helperText={errors?.chiefScientistName}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Chief scientist email"
                        value={values.chiefScientistEmail}
                        onChange={(e) => onChange({ chiefScientistEmail: e.target.value, chiefScientistId: undefined })}
                        size="small"
                        error={Boolean(errors?.chiefScientistEmail)}
                        helperText={errors?.chiefScientistEmail}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <VerificationIcon userId={values.chiefScientistId} emailValue={values.chiefScientistEmail} checking={checking} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </Grid>

                {/* --- OPERATOR --- */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Operator name"
                        value={values.operatorName}
                        onChange={(e) => onChange({ operatorName: e.target.value })}
                        size="small"
                        error={Boolean(errors?.operatorName)}
                        helperText={errors?.operatorName}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Operator email"
                        value={values.operatorEmail}
                        onChange={(e) => onChange({ operatorEmail: e.target.value, operatorId: undefined })}
                        size="small"
                        error={Boolean(errors?.operatorEmail)}
                        helperText={errors?.operatorEmail}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <VerificationIcon userId={values.operatorId} emailValue={values.operatorEmail} checking={checking} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

/**
 * Memoized: the project form keeps every section's handlers stable, so typing
 * in one section re-renders only that section instead of the whole form.
 */
export const ProjectPeopleSection = React.memo(ProjectPeopleSectionImpl);
