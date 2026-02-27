import React, { useState } from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    Stack,
    InputAdornment
} from "@mui/material";
import Grid from "@mui/material/Grid";

// Icons matching the mockup design
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VerifiedIcon from '@mui/icons-material/Verified';

// Import only the specific slice of types we need
import { NewProjectFormValues } from "../types/newProject.types";

// Import centralized validation utilities
import { isValidEmail } from "@/shared/utils/validation/email.validation";
import { isNonEmpty } from "@/shared/utils/validation/required.validation";
import { VALIDATION_MESSAGES } from "@/shared/utils/validation/messages";

/**
 * Props definition.
 * Expects exactly the 'people' object from our form state.
 */
interface ProjectPeopleSectionProps {
    values: NewProjectFormValues['people'];
    // Accepts partial updates to merge into the main state
    onChange: (data: Partial<NewProjectFormValues['people']>) => void;
}

/**
 * DUMB COMPONENT (Presenter)
 * Handles the visual rendering of the Project Peoples section.
 * Applies real-time validation feedback based on shared utility functions.
 */
export const ProjectPeopleSection: React.FC<ProjectPeopleSectionProps> = ({
    values,
    onChange
}) => {
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const handleBlur = (field: keyof NewProjectFormValues['people']) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    const getNameError = (field: keyof NewProjectFormValues['people']) => {
        if (touched[field] && !isNonEmpty(values[field])) {
            return VALIDATION_MESSAGES.REQUIRED_FIELD;
        }
        return " ";
    };

    const getEmailError = (field: keyof NewProjectFormValues['people']) => {
        if (!touched[field]) return " ";
        if (!isNonEmpty(values[field])) return VALIDATION_MESSAGES.REQUIRED_FIELD;
        if (!isValidEmail(values[field])) return VALIDATION_MESSAGES.EMAIL_INVALID;
        return " ";
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
                Project peoples
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={4}>
                {/* LEFT COLUMN: Names */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            required
                            label="Data owner name"
                            value={values.dataOwnerName}
                            onChange={(e) => onChange({ dataOwnerName: e.target.value })}
                            onBlur={() => handleBlur('dataOwnerName')}
                            error={getNameError('dataOwnerName') !== " "}
                            helperText={getNameError('dataOwnerName')}
                            size="small"
                        />

                        <TextField
                            fullWidth
                            required
                            label="Chief scientist name"
                            value={values.chiefScientistName}
                            onChange={(e) => onChange({ chiefScientistName: e.target.value })}
                            onBlur={() => handleBlur('chiefScientistName')}
                            error={getNameError('chiefScientistName') !== " "}
                            helperText={getNameError('chiefScientistName')}
                            size="small"
                        />

                        <TextField
                            fullWidth
                            required
                            label="Operator name"
                            value={values.operatorName}
                            onChange={(e) => onChange({ operatorName: e.target.value })}
                            onBlur={() => handleBlur('operatorName')}
                            error={getNameError('operatorName') !== " "}
                            helperText={getNameError('operatorName')}
                            size="small"
                        />
                    </Stack>
                </Grid>

                {/* RIGHT COLUMN: Emails */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            required
                            label="Data owner email"
                            value={values.dataOwnerEmail}
                            onChange={(e) => onChange({ dataOwnerEmail: e.target.value })}
                            onBlur={() => handleBlur('dataOwnerEmail')}
                            error={getEmailError('dataOwnerEmail') !== " "}
                            helperText={getEmailError('dataOwnerEmail')}
                            size="small"
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <PersonAddIcon color="action" fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                        />

                        <TextField
                            fullWidth
                            required
                            label="Chief scientist email"
                            value={values.chiefScientistEmail}
                            onChange={(e) => onChange({ chiefScientistEmail: e.target.value })}
                            onBlur={() => handleBlur('chiefScientistEmail')}
                            error={getEmailError('chiefScientistEmail') !== " "}
                            helperText={getEmailError('chiefScientistEmail')}
                            size="small"
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <VerifiedIcon color="action" fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                        />

                        <TextField
                            fullWidth
                            required
                            label="Operator email"
                            value={values.operatorEmail}
                            onChange={(e) => onChange({ operatorEmail: e.target.value })}
                            onBlur={() => handleBlur('operatorEmail')}
                            error={getEmailError('operatorEmail') !== " "}
                            helperText={getEmailError('operatorEmail')}
                            size="small"
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <VerifiedIcon color="action" fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                        />
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};