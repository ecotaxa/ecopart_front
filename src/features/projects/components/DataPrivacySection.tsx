import React from "react";
import { Box, Typography, TextField, Stack, InputAdornment, Divider } from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { NewProjectFormValues } from "../types/newProject.types";

interface DataPrivacySectionProps {
    values: NewProjectFormValues['privacy'];
    onChange: (data: Partial<NewProjectFormValues['privacy']>) => void;
}

export const DataPrivacySection: React.FC<DataPrivacySectionProps> = ({ values, onChange }) => {
    
    // Helper to render the timeline steps exactly like the mockup
    const renderTimelineStep = (label: string, isBlue: boolean) => (
        <Stack direction="row" alignItems="center" spacing={1}>
            {isBlue ? <CheckCircleIcon color="primary" /> : <CancelIcon sx={{ color: '#9e9e9e' }} />}
            <Typography variant="body2" fontWeight={isBlue ? "bold" : "normal"} color={isBlue ? "text.primary" : "text.secondary"}>
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

            {/* CUSTOM UI: The Visual Timeline matching mockup */}
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                {renderTimelineStep("Private", true)}
                <Divider sx={{ flexGrow: 1 }} />
                {renderTimelineStep("Visible", false)}
                <Divider sx={{ flexGrow: 1 }} />
                {renderTimelineStep("Public", false)}
                <Divider sx={{ flexGrow: 1 }} />
                {renderTimelineStep("Open", false)}
            </Stack>

            {/* INPUT FIELDS: With "Months" Adornment */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <TextField
                    fullWidth
                    type="number"
                    label="Delay until visible*"
                    value={values.privateMonths}
                    onChange={(e) => onChange({ privateMonths: parseInt(e.target.value) || 0 })}
                    size="small"
                    InputProps={{
                        startAdornment: <InputAdornment position="start">Months</InputAdornment>,
                    }}
                />
                <TextField
                    fullWidth
                    type="number"
                    label="Delay until public*"
                    value={values.visibleMonths}
                    onChange={(e) => onChange({ visibleMonths: parseInt(e.target.value) || 0 })}
                    size="small"
                    InputProps={{
                        startAdornment: <InputAdornment position="start">Months</InputAdornment>,
                    }}
                />
                <TextField
                    fullWidth
                    type="number"
                    label="Delay until open*"
                    value={values.publicMonths}
                    onChange={(e) => onChange({ publicMonths: parseInt(e.target.value) || 0 })}
                    size="small"
                    InputProps={{
                        startAdornment: <InputAdornment position="start">Months</InputAdornment>,
                    }}
                />
            </Stack>
        </Box>
    );
};