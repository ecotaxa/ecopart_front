import React from "react";
import { Box, Typography, Button, TextField, Grid } from "@mui/material";

import { QcBinnedDepthProfile, SampleQcGraphs } from "../api/projects.api";
import { QcChartSeries, QcProfileChart } from "./QcProfileChart";

// Pixel-class series colours (graphs "for 1, 2 and 3 pixels").
const PIXEL_COLORS = ["#d32f2f", "#2e7d32", "#1976d2"];

/** Map a backend binned profile into chart series (x = value, y = depth). */
const toSeries = (profile: QcBinnedDepthProfile): QcChartSeries[] =>
    profile.series.map((s, i) => ({
        label: s.label,
        color: PIXEL_COLORS[i % PIXEL_COLORS.length],
        points: s.points.map((p) => ({ x: p.value, y: p.depth_m })),
    }));

interface QcSampleCardProps {
    sample: SampleQcGraphs;
    onRemove: (sampleName: string) => void;
    removeDisabled?: boolean;
}

export const QcSampleCard: React.FC<QcSampleCardProps> = ({ sample, onRemove, removeDisabled }) => {
    const { image_filtering: filtering, image_depth_profile: depthProfile } = sample;

    const pressureSeries: QcChartSeries[] = [{
        label: "pressure",
        color: "#d32f2f",
        points: depthProfile.points.map((p) => ({ x: p.image_index, y: p.depth_m })),
    }];

    const removedPct = Math.round(filtering.removed_images.percent);

    return (
        <Box sx={{ backgroundColor: "white", p: 3, borderRadius: 1, border: "1px solid #e0e0e0", mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">Sample : {sample.sample_name}</Typography>
                <Button
                    onClick={() => onRemove(sample.sample_name)}
                    disabled={removeDisabled}
                    sx={{ color: "#c2185b", fontWeight: "bold" }}
                    size="small"
                >
                    REMOVE FROM IMPORT
                </Button>
            </Box>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <QcProfileChart
                        title="Vertical profile of the pressure of each image"
                        series={pressureSeries}
                        xLabel="image index"
                        yLabel="depth (m)"
                        height={300}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                        UVP image selection (original full frame)
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                            <TextField fullWidth label="First image" value={filtering.first_image ?? "—"} size="small" InputProps={{ readOnly: true }} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <TextField fullWidth label="Last image" value={filtering.last_image ?? "—"} size="small" InputProps={{ readOnly: true }} />
                        </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        <strong>firstimage</strong> / <strong>ending</strong> from the sample header : values selected in
                        zooprocess or uvpapp by the operator to define the sample from the sequence.
                    </Typography>

                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 3, mb: 2 }}>
                        Descending filter results
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                            <TextField fullWidth label="Last used" value={filtering.last_image_used ?? "—"} size="small" InputProps={{ readOnly: true }} helperText="Last image used after descendent filter (depth profiles only)" />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <TextField fullWidth label="Removed images" value={`${filtering.removed_images.count} / ${removedPct}%`} size="small" InputProps={{ readOnly: true }} helperText="Between first and last image in number/percent" />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <Grid container spacing={4} sx={{ mt: 2 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <QcProfileChart
                        title="Vertical profile of imaged volume"
                        series={toSeries(sample.imaged_volume_profile)}
                        xLabel="imaged volume (L)"
                        xScale={sample.imaged_volume_profile.suggested_scale}
                        height={200}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    {sample.black_profile ? (
                        <QcProfileChart
                            title="Vertical profile of black for 1, 2 and 3 pixels versus pressure"
                            series={toSeries(sample.black_profile)}
                            xLabel="count"
                            xScale={sample.black_profile.suggested_scale}
                            height={200}
                            showLegend
                        />
                    ) : (
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, minHeight: 32 }}>
                                Vertical profile of black for 1, 2 and 3 pixels versus pressure
                            </Typography>
                            <Box sx={{ border: "1px dashed #ccc", height: 200, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", p: 1 }}>
                                <Typography variant="caption" color="text.secondary">No dark frames for this instrument</Typography>
                            </Box>
                        </Box>
                    )}
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <QcProfileChart
                        title="Vertical profile of particle (LPM) for 1, 2 and 3 pixels versus pressure"
                        series={toSeries(sample.particle_lpm_profile)}
                        xLabel="count"
                        xScale={sample.particle_lpm_profile.suggested_scale}
                        height={200}
                        showLegend
                    />
                </Grid>
            </Grid>
        </Box>
    );
};
