import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    MenuItem,
    CircularProgress
} from "@mui/material";
import Grid from "@mui/material/Grid";

import { NewProjectFormValues } from "../types/newProject.types";
// Import centralized API function for fetching instrument models
import { getInstrumentModels, InstrumentModel } from "@/shared/api/referenceData.api";

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
export const InstrumentMetadataSection: React.FC<InstrumentMetadataSectionProps> = ({
    values,
    onChange,
    errors,
}) => {
    // State for instrument models fetched from API
    const [instrumentModels, setInstrumentModels] = useState<InstrumentModel[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch instrument models on mount
    useEffect(() => {
        const fetchInstruments = async () => {
            setLoading(true);
            try {
                const models = await getInstrumentModels();
                setInstrumentModels(models);
            } catch (error) {
                console.error("Failed to fetch instrument models:", error);
                // Leave the list empty - UI will handle gracefully
                setInstrumentModels([]);
            } finally {
                setLoading(false);
            }
        };

        fetchInstruments();
    }, []);

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
                        disabled={loading}
                        InputProps={{
                            endAdornment: loading ? <CircularProgress size={20} /> : null,
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