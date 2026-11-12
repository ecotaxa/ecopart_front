import { memo, useMemo, useState, type ReactNode } from "react";
import { Box, ButtonBase, Link, Stack, Typography, useTheme } from "@mui/material";

import { useAuthStore } from "@/features/auth";
import { PolarMap, type MapPoint, type MarkerShape } from "@/shared/components/map";
import type { ExploreMapSample, GeoBounds, PrivacyStatus } from "../types/explore.types";
import { PRIVACY_LABELS } from "../utils/exploreFilters";

type InstrumentFamily = "UVP5" | "UVP6" | "other";

const familyOf = (instrumentModel: string): InstrumentFamily => {
    if (instrumentModel.startsWith("UVP5")) return "UVP5";
    if (instrumentModel.startsWith("UVP6")) return "UVP6";
    return "other";
};

const SHAPE_OF_FAMILY: Record<InstrumentFamily, MarkerShape> = { UVP5: "triangle", UVP6: "square", other: "circle" };
const FAMILY_LABELS: Record<InstrumentFamily, string> = { UVP5: "UVP5", UVP6: "UVP6", other: "Other instrument" };

/** An entry of the legend, which hides or shows its samples when clicked. */
type LegendKey = InstrumentFamily | PrivacyStatus | "mine";

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
    /** The smallest height: a wide map grows up to `maxHeight`. */
    height?: number;
    maxHeight?: number;
    /** The next new samples are framed once it changes; otherwise new samples keep the view (see `PolarMap`). */
    fitKey?: string | number;
}

/**
 * Polar map of the explored samples. One marker per sample: its shape gives the
 * instrument, its colour the data status, a dark ring marks the user's projects.
 * A click on an entry of the legend hides its samples (or shows them again), the
 * view staying as it is. Memoized: switching tabs or changing a graph leaves the map as it is.
 */
const ExploreMap = memo(function ExploreMap({
    samples, bounds, drawing, onBoundsDrawn, height = 420, maxHeight, fitKey,
}: ExploreMapProps) {
    const theme = useTheme();
    const statusColors = useStatusColors();
    const ringColor = theme.palette.text.primary;
    const [hidden, setHidden] = useState<ReadonlySet<LegendKey>>(() => new Set());

    const toggle = (key: LegendKey) => setHidden((prev) => {
        const next = new Set(prev);
        if (!next.delete(key)) next.add(key);
        return next;
    });

    const points = useMemo<MapPoint[]>(() => samples.flatMap((sample) => {
        const family = familyOf(sample.instrument_model);
        if (hidden.has(family) || hidden.has(sample.privacy_status) || (sample.is_my_project && hidden.has("mine"))) return [];
        return [{
            id: String(sample.sample_id),
            latitude: sample.latitude,
            longitude: sample.longitude,
            label: sample.sample_name,
            details: [
                `${sample.project_title} [${sample.project_id}]`,
                `${sample.instrument_model} · ${PRIVACY_LABELS[sample.privacy_status]}`,
            ],
            color: statusColors[sample.privacy_status],
            shape: SHAPE_OF_FAMILY[family],
            ring: sample.is_my_project ? ringColor : undefined,
        }];
    }), [samples, hidden, statusColors, ringColor]);

    const hasOtherInstruments = useMemo(
        () => samples.some((sample) => familyOf(sample.instrument_model) === "other"),
        [samples],
    );

    return (
        <PolarMap
            points={points}
            height={height}
            maxHeight={maxHeight}
            bounds={bounds}
            drawing={drawing}
            onBoundsDrawn={onBoundsDrawn}
            emptyMessage="No sample to show"
            markerOutline={null}
            fitKey={fitKey}
            legend={(
                <MapLegend
                    statusColors={statusColors}
                    ringColor={ringColor}
                    neutral={theme.palette.text.secondary}
                    hasOtherInstruments={hasOtherInstruments}
                    hidden={hidden}
                    onToggle={toggle}
                    onShowAll={() => setHidden(new Set())}
                />
            )}
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

function LegendItem({ swatch, label, hidden, onToggle }: { swatch: ReactNode; label: string; hidden: boolean; onToggle: () => void }) {
    return (
        <ButtonBase
            onClick={onToggle}
            aria-pressed={!hidden}
            title={hidden ? "Show these samples" : "Hide these samples"}
            sx={{
                gap: 0.75, px: 0.5, py: 0.25, borderRadius: 1,
                opacity: hidden ? 0.45 : 1,
                "&:hover": { bgcolor: "action.hover" },
            }}
        >
            {swatch}
            <Typography variant="caption" sx={{ textDecoration: hidden ? "line-through" : "none" }}>{label}</Typography>
        </ButtonBase>
    );
}

function MapLegend({ statusColors, ringColor, neutral, hasOtherInstruments, hidden, onToggle, onShowAll }: {
    statusColors: Record<PrivacyStatus, string>;
    ringColor: string;
    neutral: string;
    hasOtherInstruments: boolean;
    hidden: ReadonlySet<LegendKey>;
    onToggle: (key: LegendKey) => void;
    onShowAll: () => void;
}) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const families: InstrumentFamily[] = hasOtherInstruments ? ["UVP5", "UVP6", "other"] : ["UVP5", "UVP6"];
    const item = (key: LegendKey, label: string, swatch: ReactNode) => (
        <LegendItem key={key} swatch={swatch} label={label} hidden={hidden.has(key)} onToggle={() => onToggle(key)} />
    );

    return (
        <Stack
            direction="row"
            role="group"
            aria-label="Map legend: click an entry to hide or show its samples"
            sx={{ flexWrap: "wrap", alignItems: "center", columnGap: 1.5, rowGap: 0.25, mt: 1, ml: -0.5 }}
        >
            {families.map((family) => item(family, FAMILY_LABELS[family], <LegendSwatch shape={SHAPE_OF_FAMILY[family]} color={neutral} />))}
            {(Object.keys(statusColors) as PrivacyStatus[]).map((status) => (
                item(status, PRIVACY_LABELS[status], <LegendSwatch shape="circle" color={statusColors[status]} />)
            ))}
            {isAuthenticated && item("mine", "My projects", <LegendSwatch shape="circle" color="transparent" ring={ringColor} />)}
            {hidden.size > 0 && (
                <Link component="button" type="button" variant="caption" underline="hover" onClick={onShowAll}>
                    Show all
                </Link>
            )}
        </Stack>
    );
}
