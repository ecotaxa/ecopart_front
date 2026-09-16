import React from "react";
import { Box, Divider, TextField, Typography, InputAdornment, Tooltip } from "@mui/material";
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
}

interface VerificationIconProps {
    userId?: number | null;
    emailValue: string;
}

const VerificationIcon: React.FC<VerificationIconProps> = ({ userId, emailValue }) => {
    // If the email field is empty, don't show any icon
    if (!emailValue.trim()) return null;

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
                        // A different email is no longer the verified EcoPart account: drop the resolved id.
                        onChange={(e) => onChange({ dataOwnerEmail: e.target.value, dataOwnerId: null })}
                        size="small"
                        error={Boolean(errors?.dataOwnerEmail)}
                        helperText={errors?.dataOwnerEmail}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <VerificationIcon userId={values.dataOwnerId} emailValue={values.dataOwnerEmail} />
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
                        onChange={(e) => onChange({ chiefScientistEmail: e.target.value, chiefScientistId: null })}
                        size="small"
                        error={Boolean(errors?.chiefScientistEmail)}
                        helperText={errors?.chiefScientistEmail}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <VerificationIcon userId={values.chiefScientistId} emailValue={values.chiefScientistEmail} />
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
                        onChange={(e) => onChange({ operatorEmail: e.target.value, operatorId: null })}
                        size="small"
                        error={Boolean(errors?.operatorEmail)}
                        helperText={errors?.operatorEmail}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <VerificationIcon userId={values.operatorId} emailValue={values.operatorEmail} />
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
