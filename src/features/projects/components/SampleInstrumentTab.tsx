import type { ReactNode } from "react";
import { Box, Button, Divider, Grid, Paper, Radio, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SyncIcon from "@mui/icons-material/Sync";

import SectionCard from "@/shared/components/SectionCard";
import type { SampleData } from "../api/projects.api";
import { formatUtcDateTime } from "../utils/sampleFormat";
import { ReadOnlyField, SubsectionHeader } from "./SampleDetailFields";

/** Half-width cell of the two-column field grid. */
function FieldCell({ children }: { children?: ReactNode }) {
    return <Grid size={{ xs: 12, md: 6 }}>{children}</Grid>;
}

/**
 * The calibration parameters read at import. It is the only source for now:
 * the UVP DB recommendation will be a second, selectable card.
 */
function LocalCalibrationOption({ sample }: { sample: SampleData }) {
    return (
        <Paper
            variant="outlined"
            sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1.5,
                pl: 1,
                borderRadius: 1,
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
            })}
        >
            <Radio checked readOnly slotProps={{ input: { "aria-label": "Local calibration parameters" } }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={500}>Local</Typography>
                <Typography variant="caption" color="success.main" component="div" sx={{ mb: 1.5 }}>
                    For the given period, serial number and key image acquisition parameters
                </Typography>
                <Grid container spacing={2}>
                    <FieldCell><ReadOnlyField label="Aa" value={sample.instrument_settings_aa} /></FieldCell>
                    <FieldCell><ReadOnlyField label="Exp" value={sample.instrument_settings_exp} /></FieldCell>
                    <FieldCell>
                        <ReadOnlyField label="Image volume" value={sample.instrument_settings_image_volume_l} prefix="L" />
                    </FieldCell>
                    <FieldCell>
                        <ReadOnlyField label="Pixel size" value={sample.instrument_settings_pixel_size_mm} prefix="mm" />
                    </FieldCell>
                </Grid>
            </Box>
        </Paper>
    );
}

export function SampleInstrumentTab({ sample }: { sample: SampleData }) {
    return (
        <SectionCard sx={{ p: 0 }}>
            <Typography variant="h6" sx={{ px: { xs: 2.5, md: 3 }, py: 2 }}>Instrument</Typography>
            <Divider />

            <Box sx={{ p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column", gap: 4 }}>
                {/* CALIBRATION */}
                <Box>
                    <SubsectionHeader
                        title="Calibration parameters"
                        action={
                            // The recommendation comes from the UVP DB, which is not available yet.
                            // A disabled button fires no events, hence the span for the tooltip.
                            <Tooltip title="Available once the UVP DB is connected">
                                <span>
                                    <Button variant="outlined" size="small" startIcon={<SyncIcon />} disabled>
                                        Fetch recommendation
                                    </Button>
                                </span>
                            </Tooltip>
                        }
                    />
                    <LocalCalibrationOption sample={sample} />
                </Box>

                {/* KEY ACQUISITION */}
                <Box>
                    <SubsectionHeader title="Key acquisition parameters" />
                    <Grid container spacing={2}>
                        <FieldCell>
                            <ReadOnlyField label="Shutter speed" value={sample.instrument_settings_acq_shutter_speed} />
                        </FieldCell>
                        <FieldCell><ReadOnlyField label="Gain" value={sample.instrument_settings_acq_gain} /></FieldCell>
                        <FieldCell>
                            {/* Not stored by the backend yet. */}
                            <ReadOnlyField label="Transfer" value={null} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField label="Threshold" value={sample.instrument_settings_acq_threshold} />
                        </FieldCell>
                    </Grid>
                </Box>

                {/* OTHER ACQUISITION */}
                <Box>
                    <SubsectionHeader title="Other acquisition parameters" />
                    <Grid container spacing={2}>
                        <FieldCell>
                            <ReadOnlyField label="Exposure" value={sample.instrument_settings_acq_exposure} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField label="Erase border (0/1)" value={sample.instrument_settings_acq_erase_border} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField label="Description" value={sample.instrument_settings_acq_description} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField label="Task type" value={sample.instrument_settings_acq_task_type} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField label="Choice" value={sample.instrument_settings_acq_choice} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField label="Disk type" value={sample.instrument_settings_acq_disk_type} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField
                                label="Vignette ROI enlargement ratio"
                                value={sample.instrument_settings_acq_vignette_roi_enlargement_ratio}
                            />
                        </FieldCell>
                        <FieldCell />
                        <FieldCell>
                            <ReadOnlyField label="Xsize" value={sample.instrument_settings_acq_x_size} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField label="Ysize" value={sample.instrument_settings_acq_y_size} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField
                                label="Particle minimum size"
                                value={sample.instrument_settings_particule_minimum_area_pixels}
                                prefix="Pixels"
                            />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField
                                label="Vignette minimum size"
                                value={sample.instrument_settings_vignette_minimum_area_pixels}
                                prefix="Pixels"
                            />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField label="Pressure gain" value={sample.instrument_settings_acq_pressure_gain} />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField
                                label="Depth offset"
                                value={sample.instrument_settings_depth_offset_m}
                                prefix="m"
                            />
                        </FieldCell>
                    </Grid>
                </Box>

                {/* PROCESSING */}
                <Box>
                    <SubsectionHeader title="Processing parameters" />
                    <Grid container spacing={2}>
                        <FieldCell>
                            <ReadOnlyField
                                label="Image post process"
                                value={sample.instrument_settings_images_post_process}
                            />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField
                                label="UTC date time"
                                value={formatUtcDateTime(sample.instrument_settings_process_datetime, { withPrefix: false })}
                            />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField
                                label="Vignette resize ratio"
                                value={sample.instrument_settings_process_vignette_resize_factor}
                            />
                        </FieldCell>
                        <FieldCell>
                            <ReadOnlyField label="Process gamma" value={sample.instrument_settings_process_gamma} />
                        </FieldCell>
                    </Grid>
                </Box>
            </Box>
        </SectionCard>
    );
}
