import React from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    MenuItem
} from "@mui/material";
import Grid from "@mui/material/Grid";

import { NewProjectFormValues } from "../types/newProject.types";

interface InstrumentMetadataSectionProps {
    values: NewProjectFormValues["instrument"];
    onChange: (data: Partial<NewProjectFormValues["instrument"]>) => void;
    errors?: {
        model?: string;
        serialNumber?: string;
    };
}

// Hardcoded mock data for the dropdown (can be replaced by API call later)
const INSTRUMENT_MODELS = [
    "UVP5HD",
    "UVP5SD",
    "UVP5Z",
    "UVP6LP",
    "UVP6HF",
    "UVP6MHP",
    "UVP6MHF",
];

/**
 * Presentational component for the Instrument Metadata section.
 */
export const InstrumentMetadataSection: React.FC<InstrumentMetadataSectionProps> = ({
    values,
    onChange,
    errors,
}) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
                Instrument metadata
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={4}>
                {/* LEFT COLUMN: Instrument Model (Dropdown) */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        select
                        fullWidth
                        required
                        label="Instrument"
                        value={values.model}
                        onChange={(e) => onChange({ model: e.target.value })}
                        size="small"
                        error={Boolean(errors?.model)}
                        helperText={errors?.model}
                    >
                        {INSTRUMENT_MODELS.map((model) => (
                            <MenuItem key={model} value={model}>
                                {model}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                {/* RIGHT COLUMN: Serial Number */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Instrument serial number"
                        placeholder="e.g., sn000"
                        value={values.serialNumber}
                        onChange={(e) => onChange({ serialNumber: e.target.value })}
                        size="small"
                        error={Boolean(errors?.serialNumber)}
                        helperText={errors?.serialNumber}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};