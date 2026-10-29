import React, { useState } from "react";
import { Box, Typography, TextField, Stack, InputAdornment } from "@mui/material";
import PrivacyStatusInfo from "@/shared/components/PrivacyStatusInfo";
import type { NewProjectFormValues } from "../types/newProject.types";
import type { ProjectPrivacyStatus } from "../utils/projectAccess";
import { privacyDates } from "../utils/privacyMilestones";
import PrivacyTimeline from "./PrivacyTimeline";

interface DataPrivacySectionProps {
    values: NewProjectFormValues["privacy"];
    onChange: (data: Partial<NewProjectFormValues["privacy"]>) => void;
    privateMonthsError?: string;
    visibleMonthsError?: string;
    publicMonthsError?: string;
    /** The project's current status, as computed by the backend; a project being created is private. */
    currentStatus?: ProjectPrivacyStatus;
    /**
     * Acquisition date of the project's oldest sample, where the delays start: null while the project
     * has no sample, undefined when not known (project creation).
     */
    oldestSampleDate?: string | null;
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
    onChange: (data: Partial<NewProjectFormValues["privacy"]>) => void,
    setDraftValues: React.Dispatch<
        React.SetStateAction<Partial<Record<keyof NewProjectFormValues["privacy"], string>>>
    >
) => {
    return (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const validatedValue = value === "" ? 1 : parsePositiveInt(value);
        onChange({ [field]: validatedValue });
        setDraftValues((prev) => ({ ...prev, [field]: validatedValue.toString() }));
    };
};

const createNumberFieldChangeHandler = (
    field: keyof NewProjectFormValues["privacy"],
    onChange: (data: Partial<NewProjectFormValues["privacy"]>) => void,
    setDraftValues: React.Dispatch<
        React.SetStateAction<Partial<Record<keyof NewProjectFormValues["privacy"], string>>>
    >
) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDraftValues((prev) => ({ ...prev, [field]: value }));

        // Keep parent state in sync for valid non-empty typing to survive remounts.
        if (value !== "") {
            onChange({ [field]: parsePositiveInt(value) });
        }
    };
};

const DataPrivacySectionImpl: React.FC<DataPrivacySectionProps> = ({
    values,
    onChange,
    privateMonthsError,
    visibleMonthsError,
    publicMonthsError,
    currentStatus = "private",
    oldestSampleDate,
}) => {
    // Keep per-field drafts so users can temporarily clear/type invalid text,
    // while preserving their visible edits even if a save request fails.
    const [draftValues, setDraftValues] = useState<
        Partial<Record<keyof NewProjectFormValues["privacy"], string>>
    >({});

    const getDisplayValue = (
        field: keyof NewProjectFormValues["privacy"],
        fallback: number
    ) => draftValues[field] ?? fallback.toString();
    // The dates follow the delays being typed, as the STATS tab will show them once saved.
    const dates = oldestSampleDate === undefined
        ? undefined
        : privacyDates(oldestSampleDate, values.privateMonths, values.visibleMonths, values.publicMonths);

    return (
        <Box sx={{ mb: 5 }}>
            <Typography variant="h6">
                Data privacy delays
                <PrivacyStatusInfo />
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                All delays are counted in months from the acquisition date of the project's oldest sample; a project without samples stays private.
            </Typography>
            <Box sx={{ mb: 4 }}>
                <PrivacyTimeline status={currentStatus} dates={dates} />
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                <TextField
                    fullWidth
                    required
                    type="number"
                    label="Delay until visible"
                    value={getDisplayValue("privateMonths", values.privateMonths)}
                    onChange={createNumberFieldChangeHandler("privateMonths", onChange, setDraftValues)}
                    onBlur={createNumberFieldBlurHandler("privateMonths", onChange, setDraftValues)}
                    size="small"
                    error={Boolean(privateMonthsError)}
                    helperText={privateMonthsError}
                    slotProps={{
                        htmlInput: { min: 1 },
                        input: { startAdornment: <InputAdornment position="start">Months</InputAdornment> },
                    }}
                />
                <TextField
                    fullWidth
                    required
                    type="number"
                    label="Delay until public"
                    value={getDisplayValue("visibleMonths", values.visibleMonths)}
                    onChange={createNumberFieldChangeHandler("visibleMonths", onChange, setDraftValues)}
                    onBlur={createNumberFieldBlurHandler("visibleMonths", onChange, setDraftValues)}
                    size="small"
                    error={Boolean(visibleMonthsError)}
                    helperText={visibleMonthsError}
                    slotProps={{
                        htmlInput: { min: 1 },
                        input: { startAdornment: <InputAdornment position="start">Months</InputAdornment> },
                    }}
                />
                <TextField
                    fullWidth
                    required
                    type="number"
                    label="Delay until open"
                    value={getDisplayValue("publicMonths", values.publicMonths)}
                    onChange={createNumberFieldChangeHandler("publicMonths", onChange, setDraftValues)}
                    onBlur={createNumberFieldBlurHandler("publicMonths", onChange, setDraftValues)}
                    size="small"
                    error={Boolean(publicMonthsError)}
                    helperText={publicMonthsError}
                    slotProps={{
                        htmlInput: { min: 1 },
                        input: { startAdornment: <InputAdornment position="start">Months</InputAdornment> },
                    }}
                />
            </Stack>
        </Box>
    );
};

/**
 * Memoized: the project form keeps every section's handlers stable, so typing
 * in one section re-renders only that section instead of the whole form.
 */
export const DataPrivacySection = React.memo(DataPrivacySectionImpl);
