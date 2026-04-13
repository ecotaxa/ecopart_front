import React from "react";
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
 * We now allow empty strings ("") so the user can easily clear the input field 
 * to type a new number. The parent component's submit handler will validate that the final value is a positive integer.
 * This is a common pattern for handling controlled number inputs in React.
 */
const handleNumberChange = (value: string): number => {
    if (value === "") {
        // Return an empty string temporarily to allow clearing the field.
        // We cast to unknown then number here locally to bypass the strict number requirement 
        // of the parent state, knowing the parent's submit handler will validate it.
        return "" as unknown as number; 
    }
    
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? ("" as unknown as number) : parsed;
};

export const DataPrivacySection: React.FC<DataPrivacySectionProps> = ({
    values,
    onChange,
    privateMonthsError,
    visibleMonthsError,
    publicMonthsError,
}) => {
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
                    value={values.privateMonths}
                    onChange={(e) => onChange({ privateMonths: handleNumberChange(e.target.value) })}
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
                    value={values.visibleMonths}
                    onChange={(e) => onChange({ visibleMonths: handleNumberChange(e.target.value) })}
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
                    value={values.publicMonths}
                    onChange={(e) => onChange({ publicMonths: handleNumberChange(e.target.value) })}
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