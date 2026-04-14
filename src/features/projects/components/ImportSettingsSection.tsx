import React from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    Stack,
    FormControlLabel,
    Switch
} from "@mui/material";
import Grid from "@mui/material/Grid";

// Import only the specific slice of types we need
import { NewProjectFormValues } from "../types/newProject.types";

/**
 * Props definition.
 * Expects exactly the 'importSettings' object from our form state.
 */
interface ImportSettingsSectionProps {
    values: NewProjectFormValues['importSettings'];
    // Accepts partial updates to merge into the main state
    onChange: (data: Partial<NewProjectFormValues['importSettings']>) => void;
}

/**
 * DUMB COMPONENT (Presenter)
 * Handles the visual rendering of the Import Settings section.
 */
export const ImportSettingsSection: React.FC<ImportSettingsSectionProps> = ({
    values,
    onChange
}) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom >
                Import settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={4}>
                {/* LEFT COLUMN: Settings */}
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            label="Override depth offset"
                            // If the value is 0, we can display an empty string or '0' based on preference.
                            // Here we bind it directly to the state.
                            value={values.overrideDepthOffset}
                            onChange={(e) => {
                                // FIX: We use parseFloat() on s string input because TextField always returns a string, even if type="number".
                                const parsedValue = parseFloat(e.target.value);

                                onChange({
                                    // if the field is cleared, we can decide to set it to 0 or null. Here we choose 0 for simplicity.
                                    overrideDepthOffset: isNaN(parsedValue) ? 0 : parsedValue
                                });
                            }}
                            size="small"
                            slotProps={{
                                htmlInput: {
                                    // Native HTML attributes to restrict input to decimal numbers
                                    type: "number",
                                    step: "0.1",
                                }
                            }}
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={values.enableDescentFilter}
                                    onChange={(e) => onChange({ enableDescentFilter: e.target.checked })}
                                    color="primary"
                                />
                            }
                            label="Enable descent filter"
                        />
                    </Stack>
                </Grid>

                {/* RIGHT COLUMN: Empty for now to match the mockup grid structure */}
                <Grid size={{ xs: 12, md: 6 }}>
                    {/* Intentionally left blank as per mockup design */}
                </Grid>
        </Box>
    );
};