import React from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    Autocomplete,
    CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid";

import type { NewProjectFormValues } from "../types/newProject.types";
import { useShips } from "@/shared/api/referenceData.hooks";

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
    /**
     * When set, the Project title field treats this string as a non-erasable prefix:
     * the user may only append text after it. Used when a title is pre-filled from
     * the import folder (New Project) or loaded from the backend (Project edit).
     * Leave undefined/empty to keep the title fully editable.
     */
    lockedTitlePrefix?: string;
}

/**
 * Presentational component for project metadata.
 * This component stays reusable because it only receives values + callbacks + errors.
 * The ship list comes from the shared reference-data cache.
 */
const ProjectMetadataSectionImpl: React.FC<ProjectMetadataSectionProps> = ({
    values,
    onChange,
    errors,
    lockedTitlePrefix,
}) => {
    // Ship names (already string[]); an empty list on failure leaves the freeSolo input usable.
    const { data: shipOptions = [], isPending: loadingShips } = useShips();

    const handleTitleChange = (newValue: string) => {
        // Loaded title is a non-erasable prefix; only allow appending after it.
        if (lockedTitlePrefix && !newValue.startsWith(lockedTitlePrefix)) {
            return;
        }
        onChange({ title: newValue });
    };

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
                        onChange={(e) => handleTitleChange(e.target.value)}
                        size="small"
                        error={Boolean(errors?.title)}
                        helperText={
                            errors?.title ||
                            (lockedTitlePrefix
                                ? "The loaded title cannot be removed — you can add text after it."
                                : undefined)
                        }
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                        multiple
                        freeSolo
                        options={shipOptions}
                        value={values.ship}
                        onChange={(_, newValue) => onChange({ ship: newValue })}
                        loading={loadingShips}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                fullWidth
                                required
                                size="small"
                                label="Ship"
                                error={Boolean(errors?.ship)}
                                helperText={errors?.ship}
                                slotProps={{
                                    input: {
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {loadingShips ? <CircularProgress size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    },
                                }}
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

                <Grid size={{ xs: 12 }}>
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
            </Grid>
        </Box>
    );
};

/**
 * Memoized: the project form keeps every section's handlers stable, so typing
 * in one section re-renders only that section instead of the whole form.
 */
export const ProjectMetadataSection = React.memo(ProjectMetadataSectionImpl);
