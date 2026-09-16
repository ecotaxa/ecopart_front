import React from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    MenuItem,
    CircularProgress
} from "@mui/material";
import Grid from "@mui/material/Grid";

import type { NewProjectFormValues } from "../types/newProject.types";
import { useInstrumentModels } from "@/shared/api/referenceData.hooks";

interface InstrumentMetadataSectionProps {
    values: NewProjectFormValues["instrument"];
    onChange: (data: Partial<NewProjectFormValues["instrument"]>) => void;
    errors?: {
        model?: string;
        serialNumber?: string;
    };
}

/**
 * Presentational component for the Instrument Metadata section.
 * Now fetches instrument models dynamically from the API instead of using hardcoded values.
 */
const InstrumentMetadataSectionImpl: React.FC<InstrumentMetadataSectionProps> = ({
    values,
    onChange,
    errors,
}) => {
    // Instrument models from the shared reference-data cache; an empty list on
    // failure shows the "No instruments available" entry.
    const { data: instrumentModels = [], isPending: loading } = useInstrumentModels();

    const modelExists = instrumentModels.some(
        (model) => model.instrument_model_name === values.model
    );
    const safeModelValue = modelExists ? values.model : "";

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
                        value={safeModelValue}
                        onChange={(e) => onChange({ model: e.target.value })}
                        size="small"
                        error={Boolean(errors?.model)}
                        helperText={errors?.model}
                        disabled={loading}
                        slotProps={{
                            input: {
                                endAdornment: loading ? <CircularProgress size={20} /> : null,
                            },
                        }}
                    >
                        {instrumentModels.map((model) => (
                            <MenuItem key={model.instrument_model_id} value={model.instrument_model_name}>
                                {model.instrument_model_name}
                            </MenuItem>
                        ))}
                        {/* Show message when no instruments are available */}
                        {!loading && instrumentModels.length === 0 && (
                            <MenuItem value="" disabled>
                                No instruments available
                            </MenuItem>
                        )}
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

/**
 * Memoized: the project form keeps every section's handlers stable, so typing
 * in one section re-renders only that section instead of the whole form.
 */
export const InstrumentMetadataSection = React.memo(InstrumentMetadataSectionImpl);
