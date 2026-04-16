import React, { useState } from "react";
import { Box, Typography, TextField, Stack, InputAdornment, Divider } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { NewProjectFormValues } from "../types/newProject.types";

interface DataPrivacySectionProps {
    values: NewProjectFormValues["privacy"];
    onChange: (data: Partial<NewProjectFormValues["privacy"]>) => void;
    privateMonthsError?: string;
    visibleMonthsError?: string;
    publicMonthsError?: string;
}

/**
 * Parse and clamp to a minimum of 1 month.
 */
const parsePositiveInt = (value: string): number => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return 1;
    }

    return parsed;
};

/**
 * Handle number field blur: validate and clamp to positive int.
 * During onChange, we allow any string (including empty) for natural typing experience.
 * On blur, we validate and update the parent with a clamped value.
 */
const createNumberFieldBlurHandler = (
    field: keyof NewProjectFormValues["privacy"],
    onChange: (data: Partial<NewProjectFormValues["privacy"]>) => void
) => {
    return (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const validatedValue = value === "" ? 1 : parsePositiveInt(value);
        onChange({ [field]: validatedValue });
    };
};

export const DataPrivacySection: React.FC<DataPrivacySectionProps> = ({
    values,
    onChange,
    privateMonthsError,
    visibleMonthsError,
    publicMonthsError,
}) => {
    // Keep string display values to allow empty state during typing
    // Initialize from parent values; users can edit freely without cascading renders
    const [displayValues, setDisplayValues] = useState({
        privateMonths: values.privateMonths.toString(),
        visibleMonths: values.visibleMonths.toString(),
        publicMonths: values.publicMonths.toString(),
    });
    const renderTimelineStep = (label: string, isBlue: boolean) => (
        <Stack direction="row" alignItems="center" spacing={1}>
            {isBlue ? <CheckCircleIcon color="primary" aria-hidden="true" /> : <CancelIcon sx={{ color: "#9e9e9e" }} aria-hidden="true" />}
            <Typography
                variant="body2"
                fontWeight={isBlue ? "bold" : "normal"}
                color={isBlue ? "text.primary" : "text.secondary"}
            >
                {label}
            </Typography>
        </Stack>
    );

    return (
        <Box sx={{ mb: 5 }}>
            <Typography variant="h6">Data privacy delays</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                All delays are computed from the date of the first sample.
            </Typography>

            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                {renderTimelineStep("Private", true)}
                <Divider sx={{ flexGrow: 1 }} />
                {renderTimelineStep("Visible", false)}
                <Divider sx={{ flexGrow: 1 }} />
                {renderTimelineStep("Public", false)}
                <Divider sx={{ flexGrow: 1 }} />
                {renderTimelineStep("Open", false)}
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                <TextField
                    fullWidth
                    required
                    type="number"
                    label="Delay until visible"
                    value={displayValues.privateMonths}
                    onChange={(e) => setDisplayValues({ ...displayValues, privateMonths: e.target.value })}
                    onBlur={createNumberFieldBlurHandler("privateMonths", onChange)}
                    size="small"
                    inputProps={{ min: 1 }}
                    error={Boolean(privateMonthsError)}
                    helperText={privateMonthsError}
                    InputProps={{
                        startAdornment: <InputAdornment position="start">Months</InputAdornment>,
                    }}
                />
                <TextField
                    fullWidth
                    required
                    type="number"
                    label="Delay until public"
                    value={displayValues.visibleMonths}
                    onChange={(e) => setDisplayValues({ ...displayValues, visibleMonths: e.target.value })}
                    onBlur={createNumberFieldBlurHandler("visibleMonths", onChange)}
                    size="small"
                    inputProps={{ min: 1 }}
                    error={Boolean(visibleMonthsError)}
                    helperText={visibleMonthsError}
                    InputProps={{
                        startAdornment: <InputAdornment position="start">Months</InputAdornment>,
                    }}
                />
                <TextField
                    fullWidth
                    required
                    type="number"
                    label="Delay until open"
                    value={displayValues.publicMonths}
                    onChange={(e) => setDisplayValues({ ...displayValues, publicMonths: e.target.value })}
                    onBlur={createNumberFieldBlurHandler("publicMonths", onChange)}
                    size="small"
                    inputProps={{ min: 1 }}
                    error={Boolean(publicMonthsError)}
                    helperText={publicMonthsError}
                    InputProps={{
                        startAdornment: <InputAdornment position="start">Months</InputAdornment>,
                    }}
                />
            </Stack>
        </Box>
    );
};