import React, { useState } from "react";
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
import type { NewProjectFormValues } from "../types/newProject.types";

/**
 * Props definition.
 * Expects exactly the 'importSettings' object from our form state.
 */
interface ImportSettingsSectionProps {
    values: NewProjectFormValues['importSettings'];
    // Accepts partial updates to merge into the main state
    onChange: (data: Partial<NewProjectFormValues['importSettings']>) => void;
}

/** A complete decimal number ("-1", "0.5", "12.") — the only drafts worth propagating while typing. */
const COMPLETE_DECIMAL = /^-?\d+(\.\d*)?$/;

/**
 * DUMB COMPONENT (Presenter)
 * Handles the visual rendering of the Import Settings section.
 */
const ImportSettingsSectionImpl: React.FC<ImportSettingsSectionProps> = ({
    values,
    onChange
}) => {
    // The offset is edited through a text draft: parsing `e.target.value` on every
    // keystroke would turn "1." or "-" into 0 and make decimals impossible to type.
    // The draft is propagated as soon as it reads as a number and normalised on blur.
    const [draft, setDraft] = useState(String(values.overrideDepthOffset));
    // The value this draft was last synchronised with; a different incoming value
    // (e.g. the project loaded from the backend) replaces the draft. Done as a
    // state adjustment during render, not in an effect, so no stale frame shows.
    const [syncedValue, setSyncedValue] = useState(values.overrideDepthOffset);
    if (values.overrideDepthOffset !== syncedValue) {
        setSyncedValue(values.overrideDepthOffset);
        setDraft(String(values.overrideDepthOffset));
    }

    const propagate = (next: number) => {
        setSyncedValue(next);
        onChange({ overrideDepthOffset: next });
    };

    const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setDraft(raw);
        const trimmed = raw.trim();
        if (COMPLETE_DECIMAL.test(trimmed)) {
            const parsed = Number.parseFloat(trimmed);
            if (Number.isFinite(parsed)) propagate(parsed);
        }
    };

    const handleOffsetBlur = () => {
        const parsed = Number.parseFloat(draft.trim());
        // An empty or unparsable field falls back to 0 (no offset).
        const next = Number.isFinite(parsed) ? parsed : 0;
        setDraft(String(next));
        propagate(next);
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom >
                Import settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={4}>
                {/* LEFT COLUMN: Settings */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            label="Override depth offset"
                            value={draft}
                            onChange={handleOffsetChange}
                            onBlur={handleOffsetBlur}
                            size="small"
                            slotProps={{
                                htmlInput: {
                                    // A text input with a decimal keypad: `type="number"` would
                                    // blank the value on partial input ("1.", "-") in most browsers.
                                    inputMode: "decimal",
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
            </Grid>
        </Box>
    );
};

/**
 * Memoized: the project form keeps every section's handlers stable, so typing
 * in one section re-renders only that section instead of the whole form.
 */
export const ImportSettingsSection = React.memo(ImportSettingsSectionImpl);
