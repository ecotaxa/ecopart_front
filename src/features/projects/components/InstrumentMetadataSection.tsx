import React from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    MenuItem
} from "@mui/material";
import Grid from "@mui/material/Grid";

// Import only the specific slice of types we need
import { NewProjectFormValues } from "../types/newProject.types";

/**
 * Props definition.
 * Expects exactly the 'instrument' object from our form state.
 */
interface InstrumentMetadataSectionProps {
    values: NewProjectFormValues['instrument'];
    onChange: (data: Partial<NewProjectFormValues['instrument']>) => void;
}

// Hardcoded mock data for the dropdown (can be replaced by API call later)
const INSTRUMENT_MODELS = [
    "UVP5HD",
    "UVP5SD",
    "UVP5Z",
    "UVP6LP",
    "UVP6HF",
    "UVP6MHP",
    "UVP6MHF"
];

/**
 * Presentational component for the Instrument Metadata section.
 */
export const InstrumentMetadataSection: React.FC<InstrumentMetadataSectionProps> = ({
    values,
    onChange
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
                        // We pass an object with just the 'model' key updated
                        onChange={(e) => onChange({ model: e.target.value })}
                        size="small"
                    >
                        {/* Map over our constants to create the dropdown options */}
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
                        // We pass an object with just the 'serialNumber' key updated
                        onChange={(e) => onChange({ serialNumber: e.target.value })}
                        size="small"
                    />
                </Grid>
            </Grid>
        </Box>
    );
};