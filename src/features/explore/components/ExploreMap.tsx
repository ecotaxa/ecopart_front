import { memo, useMemo, type ReactNode } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";

import { PolarMap, type MapPoint, type MarkerShape } from "@/shared/components/map";
import type { ExploreMapSample, GeoBounds, PrivacyStatus } from "../types/explore.types";
import { PRIVACY_LABELS } from "../utils/exploreFilters";

const shapeOf = (instrumentModel: string): MarkerShape => {
    if (instrumentModel.startsWith("UVP5")) return "triangle";
    if (instrumentModel.startsWith("UVP6")) return "square";
    return "circle";
};

function useStatusColors(): Record<PrivacyStatus, string> {
    const { palette } = useTheme();
    return useMemo(() => ({
        private: palette.error.main,
        visible: palette.warning.main,
        public: palette.info.main,
        open: palette.success.main,
    }), [palette]);
}

export interface ExploreMapProps {
    samples: ExploreMapSample[];
    /** The location criterion, drawn as a box. */
    bounds: GeoBounds | null;
    /** When on, a drag draws the location box instead of moving the map. */
    drawing: boolean;
    onBoundsDrawn: (bounds: GeoBounds) => void;
    height?: number;
}

/**
 * Polar map of the explored samples. One marker per sample: its shape gives the
 * instrument, its colour the data status, a dark ring marks the user's projects.
 * Memoized: switching tabs or changing a graph leaves the map as it is.
 */
const ExploreMap = memo(function ExploreMap({ samples, bounds, drawing, onBoundsDrawn, height = 420 }: ExploreMapProps) {
    const theme = useTheme();
    const statusColors = useStatusColors();
    const ringColor = theme.palette.text.primary;

    const points = useMemo<MapPoint[]>(() => samples.map((sample) => ({
        id: String(sample.sample_id),
        latitude: sample.latitude,
        longitude: sample.longitude,
        label: sample.sample_name,
        details: [
            `${sample.project_title} [${sample.project_id}]`,
            `${sample.instrument_model} · ${PRIVACY_LABELS[sample.privacy_status]}`,
        ],
        color: statusColors[sample.privacy_status],
        shape: shapeOf(sample.instrument_model),
        ring: sample.is_my_project ? ringColor : undefined,
    })), [samples, statusColors, ringColor]);

    return (
        <PolarMap
            points={points}
            height={height}
            bounds={bounds}
            drawing={drawing}
            onBoundsDrawn={onBoundsDrawn}
            emptyMessage="No sample to show"
            legend={<MapLegend statusColors={statusColors} ringColor={ringColor} neutral={theme.palette.text.secondary} />}
        />
    );
});

export default ExploreMap;

function LegendSwatch({ shape, color, ring }: { shape: MarkerShape; color: string; ring?: string }) {
    const size = 10;
    if (shape === "triangle") {
        return (
            <Box
                sx={{
                    width: 0, height: 0, flexShrink: 0,
                    borderLeft: `${size / 2 + 1}px solid transparent`,
                    borderRight: `${size / 2 + 1}px solid transparent`,
                    borderBottom: `${size}px solid ${color}`,
                }}
            />
        );
    }
    return (
        <Box
            sx={{
                width: size, height: size, flexShrink: 0, bgcolor: color,
                borderRadius: shape === "circle" ? "50%" : 0,
                border: ring ? `2px solid ${ring}` : undefined,
            }}
        />
    );
}

function LegendItem({ swatch, label }: { swatch: ReactNode; label: string }) {
    return (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            {swatch}
            <Typography variant="caption">{label}</Typography>
        </Stack>
    );
}

function MapLegend({ statusColors, ringColor, neutral }: {
    statusColors: Record<PrivacyStatus, string>;
    ringColor: string;
    neutral: string;
}) {
    return (
        <Stack direction="row" sx={{ flexWrap: "wrap", columnGap: 2.5, rowGap: 0.5, mt: 1 }}>
            <LegendItem swatch={<LegendSwatch shape="triangle" color={neutral} />} label="UVP5" />
            <LegendItem swatch={<LegendSwatch shape="square" color={neutral} />} label="UVP6" />
            {(Object.keys(statusColors) as PrivacyStatus[]).map((status) => (
                <LegendItem key={status} swatch={<LegendSwatch shape="circle" color={statusColors[status]} />} label={PRIVACY_LABELS[status]} />
            ))}
            <LegendItem swatch={<LegendSwatch shape="circle" color="transparent" ring={ringColor} />} label="My projects" />
        </Stack>
    );
}
