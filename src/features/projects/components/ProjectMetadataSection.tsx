import React from "react";
import {
    Box,
    Typography,
    TextField,
    FormControlLabel,
    Switch,
    Autocomplete,
    Chip,
    Divider,
    Stack
} from "@mui/material";
import Grid from "@mui/material/Grid";

// We import ONLY the type we need for this section
import { NewProjectFormValues } from "../types/newProject.types";

/**
 * Props for the ProjectMetadataSection.
 * It strictly expects the 'metadata' slice of the form state.
 */
interface ProjectMetadataSectionProps {
    values: NewProjectFormValues['metadata'];
    // onChange accepts a Partial object. Meaning it can receive { title: "new" } 
    // or { acronym: "new", description: "new" } at the same time.
    onChange: (data: Partial<NewProjectFormValues['metadata']>) => void;
}

/**
 * DUMB COMPONENT (Presenter)
 * Handles the visual rendering of the project metadata fields.
 * It maintains NO internal state. It relies entirely on the parent.
 */
export const ProjectMetadataSection: React.FC<ProjectMetadataSectionProps> = ({ values, onChange }) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
                Project metadata
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={4}>
                {/* LEFT COLUMN */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            required
                            label="Project title"
                            value={values.title}
                            // We pass an object with ONLY the field that changed
                            onChange={(e) => onChange({ title: e.target.value })}
                            size="small"
                        />

                        <TextField
                            fullWidth
                            required
                            label="Project acronym"
                            value={values.acronym}
                            onChange={(e) => onChange({ acronym: e.target.value })}
                            size="small"
                        />

                        <TextField
                            fullWidth
                            required
                            multiline
                            rows={4}
                            label="Project description"
                            value={values.description}
                            onChange={(e) => onChange({ description: e.target.value })}
                            size="small"
                        />
                    </Stack>
                </Grid>

                {/* RIGHT COLUMN */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={3}>
                        {/* Autocomplete is used to manage an array of strings (Chips).
                            'multiple' allows multiple selections.
                            'freeSolo' allows typing arbitrary text not in the options list.
                        */}
                        <Autocomplete
                            multiple
                            freeSolo
                            options={[]} // No predefined options, user types freely
                            value={values.ship} // Binds to the array of strings
                            onChange={(_, newValue) => onChange({ ship: newValue })}
                            renderTags={(value: readonly string[], getTagProps) =>
                                value.map((option: string, index: number) => (
                                    <Chip 
                                        variant="filled" 
                                        label={option} 
                                        {...getTagProps({ index })} 
                                        size="small" 
                                        sx={{ backgroundColor: '#e0e0e0' }} // Matches mockup gray chip
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    required
                                    label="Ship"
                                    placeholder="Add a ship and press Enter"
                                    size="small"
                                />
                            )}
                        />

                        <TextField
                            fullWidth
                            required
                            label="Cruise"
                            value={values.cruise}
                            onChange={(e) => onChange({ cruise: e.target.value })}
                            size="small"
                        />

                        {/* TOGGLE SWITCHES */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={values.filteredBeforeImport}
                                        onChange={(e) => onChange({ filteredBeforeImport: e.target.checked })}
                                        color="primary"
                                    />
                                }
                                label="Data filtered before import into EcoPart"
                            />
                            
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={values.timeDurationCheck}
                                        onChange={(e) => onChange({ timeDurationCheck: e.target.checked })}
                                        color="primary"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body1">Time duration check</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Disable if the project is longer than 1 year.
                                        </Typography>
                                    </Box>
                                }
                                sx={{ alignItems: 'flex-start' }} // Aligns switch with the top of the multiline label
                            />
                        </Box>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};