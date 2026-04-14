import React from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    Stack,
    FormControlLabel,
    Switch,
    Autocomplete,
} from "@mui/material";
import Grid from "@mui/material/Grid";

import { NewProjectFormValues } from "../types/newProject.types";

interface ProjectMetadataSectionProps {
    values: NewProjectFormValues["metadata"];
    onChange: (data: Partial<NewProjectFormValues["metadata"]>) => void;
    errors?: {
        title?: string;
        acronym?: string;
        ship?: string;
        cruise?: string;
        description?: string;
    };
}

const SHIP_OPTIONS = [
    "pourquoi_pas",
    "tara",
    "boat1",
    "boat2",
    "thalassa",
    "atalante",
];

/**
 * Presentational component for project metadata.
 * This component stays reusable because it only receives values + callbacks + errors.
 */
export const ProjectMetadataSection: React.FC<ProjectMetadataSectionProps> = ({
    values,
    onChange,
    errors,
}) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
                Project metadata
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Project title"
                        value={values.title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        size="small"
                        error={Boolean(errors?.title)}
                        helperText={errors?.title}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                        multiple
                        freeSolo
                        options={SHIP_OPTIONS}
                        value={values.ship}
                        onChange={(_, newValue) => onChange({ ship: newValue })}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                fullWidth
                                required
                                size="small"
                                label="Ship"
                                error={Boolean(errors?.ship)}
                                helperText={errors?.ship}
                            />
                        )}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Project acronym"
                        value={values.acronym}
                        onChange={(e) => onChange({ acronym: e.target.value })}
                        size="small"
                        error={Boolean(errors?.acronym)}
                        helperText={errors?.acronym}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Cruise"
                        value={values.cruise}
                        onChange={(e) => onChange({ cruise: e.target.value })}
                        size="small"
                        error={Boolean(errors?.cruise)}
                        helperText={errors?.cruise}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        required
                        label="Project description"
                        value={values.description}
                        onChange={(e) => onChange({ description: e.target.value })}
                        size="small"
                        error={Boolean(errors?.description)}
                        helperText={errors?.description}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={values.filteredBeforeImport}
                                        onChange={(e) => onChange({ filteredBeforeImport: e.target.checked })}
                                    />
                                }
                                label="Data filtered before import into EcoPart"
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={values.timeDurationCheck}
                                        onChange={(e) => onChange({ timeDurationCheck: e.target.checked })}
                                    />
                                }
                                label="Time duration check"

                            />
                            <Typography variant="caption" color="text.secondary">
                                <br />Disable if the project is longer than 1 year.
                            </Typography>
                        </Box>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};