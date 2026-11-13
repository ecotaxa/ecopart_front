import React, { useState } from "react";
import {
    Box,
    Typography,
    TextField,
    Divider,
    FormControlLabel,
    FormHelperText,
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
    readOnly?: boolean;
}

/** A complete decimal number ("-1", "0.5", "12.") — the only drafts worth propagating while typing. */
const COMPLETE_DECIMAL = /^-?\d+(\.\d*)?$/;

/** The text shown for an offset: empty when the project does not override the samples' offsets. */
const offsetToDraft = (value: number | null): string => (value === null ? "" : String(value));

/**
 * DUMB COMPONENT (Presenter)
 * Handles the visual rendering of the Import Settings section.
 */
const ImportSettingsSectionImpl: React.FC<ImportSettingsSectionProps> = ({
    values,
    onChange,
    readOnly = false,
}) => {
    // The offset is edited through a text draft: parsing `e.target.value` on every
    // keystroke would turn "1." or "-" into 0 and make decimals impossible to type.
    // The draft is propagated as soon as it reads as a number, or as empty (no project
    // override), and normalised on blur.
    const [draft, setDraft] = useState(offsetToDraft(values.overrideDepthOffset));
    // The value this draft was last synchronised with; a different incoming value
    // (e.g. the project loaded from the backend) replaces the draft. Done as a
    // state adjustment during render, not in an effect, so no stale frame shows.
    const [syncedValue, setSyncedValue] = useState(values.overrideDepthOffset);
    if (values.overrideDepthOffset !== syncedValue) {
        setSyncedValue(values.overrideDepthOffset);
        setDraft(offsetToDraft(values.overrideDepthOffset));
    }

    const propagate = (next: number | null) => {
        if (next === syncedValue) return;
        setSyncedValue(next);
        onChange({ overrideDepthOffset: next });
    };

    const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setDraft(raw);
        const trimmed = raw.trim();
        if (trimmed === "") {
            propagate(null);
        } else if (COMPLETE_DECIMAL.test(trimmed)) {
            const parsed = Number.parseFloat(trimmed);
            if (Number.isFinite(parsed)) propagate(parsed);
        }
    };

    const handleOffsetBlur = () => {
        // An unfinished entry ("-", "abc") goes back to the last value the form holds.
        setDraft(offsetToDraft(syncedValue));
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom >
                Import settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container columnSpacing={4} rowSpacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="Override depth offset (m)"
                        value={draft}
                        onChange={handleOffsetChange}
                        onBlur={readOnly ? undefined : handleOffsetBlur}
                        size="small"
                        slotProps={{
                            input: { readOnly },
                            htmlInput: {
                                // A text input with a decimal keypad: `type="number"` would
                                // blank the value on partial input ("1.", "-") in most browsers.
                                inputMode: "decimal",
                            }
                        }}
                        helperText="Vertical distance between the pressure sensor and the imaged zone, positive when the sensor is above it. Empty: each sample keeps its own offset (UVP6 Pressure_offset, none in UVP5 files). A value here replaces it for every sample of the project."
                    />
                </Grid>
                {/* Spacer: the switches below start on their own row */}
                <Grid size={{ md: 6 }} sx={{ display: { xs: "none", md: "block" } }} />

                <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={values.enableDescentFilter}
                                onChange={(e) => onChange({ enableDescentFilter: e.target.checked })}
                                color="primary"
                                disabled={readOnly}
                            />
                        }
                        label="Enable descent filter"
                    />
                </Grid>

                {/* Filtered project and Time duration check: the options the quality checks of the STATS tab read */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={values.filteredProject}
                                onChange={(e) => onChange({ filteredProject: e.target.checked })}
                                color="primary"
                                disabled={readOnly}
                            />
                        }
                        label="Filtered project"
                    />
                    <FormHelperText sx={{ mt: 0 }}>
                        The data were filtered before their import. A UVP5HD project left unfiltered gets a warning in its STATS tab.
                    </FormHelperText>
                </Grid>

                <Grid size={12}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={values.timeDurationCheck}
                                onChange={(e) => onChange({ timeDurationCheck: e.target.checked })}
                                color="primary"
                                disabled={readOnly}
                            />
                        }
                        label="Time duration check"
                    />
                    <FormHelperText sx={{ mt: 0 }}>
                        The STATS tab warns when the samples span more than a year. Disable it on a project longer than a year.
                    </FormHelperText>
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
