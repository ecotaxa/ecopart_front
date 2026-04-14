import React from "react";
import { Box, Divider, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { NewProjectFormValues } from "../types/newProject.types";

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

export const ProjectPeopleSection: React.FC<ProjectPeopleSectionProps> = ({
    values,
    onChange,
    errors,
}) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
                Project peoples
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={4}>
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
                        onChange={(e) => onChange({ dataOwnerEmail: e.target.value })}
                        size="small"
                        error={Boolean(errors?.dataOwnerEmail)}
                        helperText={errors?.dataOwnerEmail}
                    />
                </Grid>

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
                        onChange={(e) => onChange({ chiefScientistEmail: e.target.value })}
                        size="small"
                        error={Boolean(errors?.chiefScientistEmail)}
                        helperText={errors?.chiefScientistEmail}
                    />
                </Grid>

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
                        onChange={(e) => onChange({ operatorEmail: e.target.value })}
                        size="small"
                        error={Boolean(errors?.operatorEmail)}
                        helperText={errors?.operatorEmail}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};