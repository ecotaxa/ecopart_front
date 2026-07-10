import React from "react";
import { Box, Typography, Button, TextField } from "@mui/material";
import Grid from "@mui/material/Grid";

import { ecotaxaColors } from "@/theme";
import SectionCard from "@/shared/components/SectionCard";
import { QcBinnedDepthProfile, SampleQcGraphs } from "../api/projects.api";
import { QcChartSeries, QcProfileChart } from "./QcProfileChart";

// Shades of blue for the pixel-class series (graphs "for 1, 2 and 3 pixels"):
// light → medium → dark, so the three curves stay distinguishable.
const PIXEL_COLORS = [ecotaxaColors.mainblue[400], ecotaxaColors.mainblue[600], ecotaxaColors.mainblue[800]];

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
        color: ecotaxaColors.mainblue[500], // blue for the main pressure profile
        points: depthProfile.points.map((p) => ({ x: p.image_index, y: p.depth_m })),
    }];

    const removedPct = Math.round(filtering.removed_images.percent);

    // Bottom-row profile charts. The "black" profile only exists for instruments
    // with dark frames — when absent, its chart is omitted entirely (no placeholder).
    // Fewer charts => each one gets more width.
    const profileCharts = [
        {
            key: "imaged-volume",
            title: "Vertical profile of imaged volume",
            series: toSeries(sample.imaged_volume_profile),
            xLabel: "imaged volume (L)",
            xScale: sample.imaged_volume_profile.suggested_scale,
            showLegend: false,
        },
        ...(sample.black_profile ? [{
            key: "black",
            title: "Vertical profile of black for 1, 2 and 3 pixels versus pressure",
            series: toSeries(sample.black_profile),
            xLabel: "count",
            xScale: sample.black_profile.suggested_scale,
            showLegend: true,
        }] : []),
        {
            key: "particle-lpm",
            title: "Vertical profile of particle (LPM) for 1, 2 and 3 pixels versus pressure",
            series: toSeries(sample.particle_lpm_profile),
            xLabel: "count",
            xScale: sample.particle_lpm_profile.suggested_scale,
            showLegend: true,
        },
    ];
    const profileChartCols = profileCharts.length <= 2 ? 6 : 4;

    return (
        <SectionCard sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">Sample : {sample.sample_name}</Typography>
                <Button
                    onClick={() => onRemove(sample.sample_name)}
                    disabled={removeDisabled}
                    color="error"
                    sx={{ fontWeight: "bold" }}
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
                        height={340}
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
                        <strong>firstimage</strong> / <strong>endimg</strong> from the sample header : values selected in
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
                {profileCharts.map((c) => (
                    <Grid key={c.key} size={{ xs: 12, md: profileChartCols }}>
                        <QcProfileChart
                            title={c.title}
                            series={c.series}
                            xLabel={c.xLabel}
                            xScale={c.xScale}
                            height={320}
                            showLegend={c.showLegend}
                        />
                    </Grid>
                ))}
            </Grid>
        </SectionCard>
    );
};
